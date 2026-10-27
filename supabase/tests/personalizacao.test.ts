import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Camisa personalizada (loja extra, item 3) no banco simulado (PGlite): adicional somado no banco, validação de formato
// e faixa, produto não personalizável recusado, persistência por item e consulta do pedido. Não testado no Supabase real.
let db: PGlite;
const PRICE = 21990; // camiseta-ferrari-2026 (APX-007), personalizável no seed com adicional de R$ 30,00
const FEE = 3000;
const create = (id: string, items: Record<string, unknown>[], extra: Record<string, unknown> = {}) =>
  db.query<{ subtotal_cents: number; total_cents: number }>("select * from create_order($1::jsonb)", [orderPayload(id, items as { sku: string; quantity: number }[], { payment_method: "cartao", ...extra })]);

beforeAll(async () => {
  db = await createDb();
  await db.exec("update product_variants set stock = 50 where sku in ('APX-007-M', 'APX-007-G', 'APX-001-M')");
  await asRole(db, "service_role");
}, 60_000);

describe("personalização (banco simulado)", () => {
  it("o seed marca as camisas de equipe como personalizáveis (público lê a configuração)", async () => {
    await asRole(db, "anon");
    const { rows } = await db.query<{ personalizable: boolean; personalization_fee_cents: number; personalization_max_name: number }>("select personalizable, personalization_fee_cents, personalization_max_name from products where slug = 'camiseta-ferrari-2026'");
    expect(rows[0]).toEqual({ personalizable: true, personalization_fee_cents: FEE, personalization_max_name: 12 });
    await asRole(db, "service_role");
  });

  it("adicional por unidade somado no banco; mesma camisa e tamanho com nomes diferentes são itens diferentes", async () => {
    const { rows } = await create("P-1", [
      { sku: "APX-007-M", quantity: 2, personalization: { name: "LEWIS", number: "44" } },
      { sku: "APX-007-M", quantity: 1, personalization: { name: "CHARLES", number: "16" } },
      { sku: "APX-007-M", quantity: 1 },
    ]);
    expect(rows[0].subtotal_cents).toBe((PRICE + FEE) * 3 + PRICE);
    const items = await db.query<{ personalization: unknown; personalization_fee_cents: number; quantity: number }>("select personalization, personalization_fee_cents, quantity from order_items where order_id = 'P-1' order by quantity desc, personalization_fee_cents desc");
    expect(items.rows).toEqual([
      { personalization: { name: "LEWIS", number: "44" }, personalization_fee_cents: FEE, quantity: 2 },
      { personalization: { name: "CHARLES", number: "16" }, personalization_fee_cents: FEE, quantity: 1 },
      { personalization: null, personalization_fee_cents: 0, quantity: 1 },
    ]);
    expect((await db.query<{ stock: number }>("select stock from product_variants where sku = 'APX-007-M'")).rows[0].stock).toBe(46);
  });

  it("recusa formato, tamanho, faixa e produto não personalizável (nada é gravado)", async () => {
    const bad = [
      { sku: "APX-007-G", quantity: 1, personalization: { name: "lewis" } },
      { sku: "APX-007-G", quantity: 1, personalization: { name: "ABCDEFGHIJKLM" } },
      { sku: "APX-007-G", quantity: 1, personalization: { number: "100" } },
      { sku: "APX-007-G", quantity: 1, personalization: {} },
      { sku: "APX-001-M", quantity: 1, personalization: { name: "LEWIS" } },
    ];
    for (const [i, item] of bad.entries()) await expect(create(`P-X${i}`, [item])).rejects.toThrow(/PERSONALIZACAO_INVALIDA/);
    expect((await db.query("select 1 from orders where id like 'P-X%'")).rows).toHaveLength(0);
    expect((await db.query<{ stock: number }>("select stock from product_variants where sku = 'APX-007-G'")).rows[0].stock).toBe(50);
  });

  it("a consulta de pedido mostra o nome e o número", async () => {
    const result = await db.query<{ r: { items: { personalization: unknown }[] } }>("select lookup_order('P-1', 'maria@exemplo.com') as r");
    expect(result.rows[0].r.items.map((item) => item.personalization)).toContainEqual({ name: "LEWIS", number: "44" });
  });
});
