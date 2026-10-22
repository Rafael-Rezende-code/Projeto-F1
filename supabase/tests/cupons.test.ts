import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Cupons no banco simulado (PGlite): validação e uso DENTRO da create_order (transação), devolução no cancelamento e
// RLS. Não testado contra o Supabase real.
let db: PGlite;
const PRICE = 64990; // APX-001 (Scuderia Racing Jacket) no seed
const create = (id: string, coupon?: string, quantity = 1) =>
  db.query<{ subtotal_cents: number; discount_cents: number; shipping_cents: number; total_cents: number; coupon_code: string }>(
    "select * from create_order($1::jsonb)",
    [orderPayload(id, [{ sku: "APX-001-M", quantity }], coupon ? { coupon } : {})],
  );
const uses = async (code: string) => (await db.query<{ uses: number }>("select uses from coupons where lower(code) = lower($1)", [code])).rows[0].uses;

beforeAll(async () => {
  db = await createDb();
  await db.exec(`
    update product_variants set stock = 100 where sku = 'APX-001-M';
    insert into coupons (code, kind, value, min_subtotal_cents, max_uses) values
      ('DEZ', 'percentual', 10, 0, null),
      ('CEM', 'valor_fixo', 10000, 0, null),
      ('GIGANTE', 'valor_fixo', 99999999, 0, null),
      ('FRETE', 'frete_gratis', 0, 0, null),
      ('MINIMO', 'percentual', 5, 100000, null),
      ('UMA', 'percentual', 15, 0, 1),
      ('DESLIGADO', 'percentual', 5, 0, null);
    update coupons set active = false where code = 'DESLIGADO';
    insert into coupons (code, kind, value, starts_at, ends_at) values ('VELHO', 'percentual', 5, now() - interval '10 days', now() - interval '1 day');
    insert into coupons (code, kind, value, starts_at) values ('FUTURO', 'percentual', 5, now() + interval '1 day');
  `);
}, 60_000);

describe("cupons (banco simulado)", () => {
  it("percentual, valor fixo e frete grátis; código sem diferenciar maiúsculas; total é a base do pagamento", async () => {
    await asRole(db, "service_role");
    const ten = (await create("C-1", "dez")).rows[0];
    expect(ten).toMatchObject({ subtotal_cents: PRICE, discount_cents: Math.floor(PRICE * 0.1), coupon_code: "DEZ" });
    expect(ten.total_cents).toBe(PRICE - Math.floor(PRICE * 0.1) + 2490);
    expect((await create("C-2", "CEM")).rows[0].discount_cents).toBe(10000);
    const free = (await create("C-3", "Frete")).rows[0];
    expect(free).toMatchObject({ discount_cents: 0, shipping_cents: 0, total_cents: PRICE });
  });

  it("desconto nunca maior que o subtotal dos itens", async () => {
    await asRole(db, "service_role");
    const big = (await create("C-4", "GIGANTE")).rows[0];
    expect(big.discount_cents).toBe(PRICE);
    expect(big.total_cents).toBe(2490);
  });

  it("recusa expirado, futuro, desativado, inexistente e mínimo não atingido (e nada é gravado)", async () => {
    await asRole(db, "service_role");
    for (const [code, reason] of [["VELHO", "expirado"], ["FUTURO", "ainda_nao_comecou"], ["DESLIGADO", "inativo"], ["NAOEXISTE", "inexistente"], ["MINIMO", "minimo"]]) {
      await expect(create(`C-X-${code}`, code)).rejects.toMatchObject({ message: "CUPOM_INVALIDO", detail: reason });
    }
    await db.exec("reset role");
    expect((await db.query<{ n: number }>("select count(*)::int n from orders where id like 'C-X-%'")).rows[0].n).toBe(0);
    // mínimo atingido com 2 unidades
    await asRole(db, "service_role");
    expect((await create("C-5", "MINIMO", 2)).rows[0].discount_cents).toBe(Math.floor(2 * PRICE * 0.05));
  });

  it("limite de usos: o segundo pedido recebe 'esgotado' (UPDATE condicional dentro da transação)", async () => {
    await asRole(db, "service_role");
    await create("C-6", "UMA");
    expect(await uses("UMA")).toBe(1);
    await expect(create("C-7", "UMA")).rejects.toMatchObject({ message: "CUPOM_INVALIDO", detail: "esgotado" });
    // Corrida no limite: mesmo que a avaliação já tenha passado (outro pedido leu uses = 0), o UPDATE condicional não
    // passa do limite. Simula: zera "uses" só na leitura não é possível; conferimos a trava diretamente.
    await db.exec("reset role");
    const race = await db.query("update coupons set uses = uses + 1 where code = 'UMA' and (max_uses is null or uses < max_uses) returning id");
    expect(race.rows).toHaveLength(0);
    expect(await uses("UMA")).toBe(1);
  });

  it("pedido cancelado devolve o estoque e o uso do cupom, uma vez só", async () => {
    await db.exec("reset role");
    const before = await uses("UMA");
    await asRole(db, "service_role");
    expect((await db.query<{ r: boolean }>("select release_order_stock('C-6') r")).rows[0].r).toBe(true);
    expect((await db.query<{ r: boolean }>("select release_order_stock('C-6') r")).rows[0].r).toBe(false);
    await db.exec("reset role");
    expect(await uses("UMA")).toBe(before - 1);
  });

  it("prévia (quote_coupon) para o visitante; a tabela é invisível sem ser admin", async () => {
    await asRole(db, "anon");
    const quote = (await db.query<{ q: { ok: boolean; discount_cents: number } }>("select quote_coupon('dez', 10000, 0) q")).rows[0].q;
    expect(quote).toMatchObject({ ok: true, discount_cents: 1000 });
    expect((await db.query<{ q: { reason: string } }>("select quote_coupon('VELHO', 10000, 0) q")).rows[0].q.reason).toBe("expirado");
    await expect(db.query("select * from coupons")).rejects.toThrow(/permission denied/);
    await asRole(db, "authenticated", "curioso@x.com");
    expect((await db.query("select * from coupons")).rows).toHaveLength(0);
    await expect(db.query("insert into coupons (code, kind, value) values ('HACK', 'percentual', 100)")).rejects.toThrow();
    await db.exec("reset role");
    await db.exec("insert into admin_emails values ('dono@loja.com') on conflict do nothing");
    await asRole(db, "authenticated", "dono@loja.com");
    expect((await db.query("select * from coupons")).rows.length).toBeGreaterThan(5);
    expect((await db.query("select * from coupon_redemptions")).rows.length).toBeGreaterThan(0);
    await db.exec("reset role");
  });
});
