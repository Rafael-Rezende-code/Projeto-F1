import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";

// Kits (loja extra, item 2) no banco simulado (PGlite): desconto de conjunto na create_order, sem cupom; remover um item
// tira o desconto; estoque insuficiente não grava nada; cupom não cumulativo; RLS. Não testado contra o Supabase real.
let db: PGlite;
const TEE = 23990; // camiseta-hamilton (APX-059)
const CAP = 19990; // bone-hamilton (APX-060)
const POSTER = 9990; // poster-hamilton (APX-062)
const KIT = Math.round(((TEE + CAP + POSTER) * 10) / 100);
type Row = { subtotal_cents: number; kit_discount_cents: number; total_cents: number; kits: { slug: string; sets: number; discount_cents: number }[]; payment_discount_cents: number };
const create = async (id: string, items: { sku: string; quantity: number }[], extra: Record<string, unknown> = {}) =>
  (await db.query<Row>("select * from create_order($1::jsonb)", [orderPayload(id, items, { payment_method: "cartao", ...extra })])).rows[0];
const full = [{ sku: "APX-059-M", quantity: 1 }, { sku: "APX-060-UN", quantity: 1 }, { sku: "APX-062-UN", quantity: 1 }];

beforeAll(async () => {
  db = await createDb();
  await db.exec(`
    update product_variants set stock = 50 where sku in ('APX-059-M', 'APX-059-G', 'APX-060-UN', 'APX-062-UN');
    insert into coupons (code, kind, value) values ('DEZ', 'percentual', 10);
  `);
}, 60_000);

describe("kits (banco simulado)", () => {
  it("o seed traz os 4 kits (um por piloto) e o público lê só os ativos", async () => {
    await asRole(db, "anon");
    expect((await db.query("select slug from kits order by slug")).rows.map((row) => (row as { slug: string }).slug)).toEqual(["kit-bortoleto", "kit-hamilton", "kit-norris", "kit-verstappen"]);
    await asRole(db, "service_role");
    await db.query("update kits set active = false where slug = 'kit-norris'");
    await asRole(db, "anon");
    expect((await db.query("select slug from kits")).rows).toHaveLength(3);
    await expect(db.query("insert into kits (slug, title, product_slugs, discount_percent) values ('x', 'X', array['a','b'], 5)")).rejects.toThrow();
    await asRole(db, "service_role");
  });

  it("kit completo: desconto no total, gravado no pedido", async () => {
    const row = await create("K-1", full);
    expect(row).toMatchObject({ subtotal_cents: TEE + CAP + POSTER, kit_discount_cents: KIT, total_cents: TEE + CAP + POSTER - KIT + 2490 });
    expect(row.kits).toEqual([{ slug: "kit-hamilton", title: "Kit dia de corrida Hamilton", sets: 1, discount_cents: KIT }]);
  });

  it("sem um dos itens, sem desconto; dois conjuntos só com duas unidades de cada (tamanhos diferentes valem)", async () => {
    expect((await create("K-2", full.slice(0, 2))).kit_discount_cents).toBe(0);
    const two = await create("K-3", [{ sku: "APX-059-M", quantity: 1 }, { sku: "APX-059-G", quantity: 1 }, { sku: "APX-060-UN", quantity: 2 }, { sku: "APX-062-UN", quantity: 3 }]);
    expect(two.kit_discount_cents).toBe(KIT * 2);
  });

  it("estoque insuficiente: nada é gravado (nem desconto, nem baixa)", async () => {
    await db.query("update product_variants set stock = 0 where sku = 'APX-062-UN'");
    await expect(create("K-4", full)).rejects.toThrow(/ESTOQUE_INSUFICIENTE/);
    expect((await db.query("select 1 from orders where id = 'K-4'")).rows).toHaveLength(0);
    expect((await db.query<{ stock: number }>("select stock from product_variants where sku = 'APX-059-M'")).rows[0].stock).toBe(50 - 1 - 1 - 1);
    await db.query("update product_variants set stock = 50 where sku = 'APX-062-UN'");
  });

  it("cupom não cumulativo com kit (configurável); Pix incide depois do kit", async () => {
    await expect(create("K-5", full, { coupon: "DEZ" })).rejects.toThrow(/CUPOM_INVALIDO/);
    const both = await create("K-6", full, { coupon: "DEZ", coupon_with_kit: true });
    expect(both.total_cents).toBe(TEE + CAP + POSTER - KIT - Math.floor((TEE + CAP + POSTER - KIT) * 0.1) + 2490);
    const pix = await create("K-7", full, { payment_method: "pix", pix_percent: 5 });
    expect(pix.payment_discount_cents).toBe(Math.round((TEE + CAP + POSTER - KIT) * 0.05));
  });

  it("item personalizado nunca entra no kit", async () => {
    const res = await db.query<{ r: { total: number } }>("select kit_discounts($1::jsonb) as r", [
      JSON.stringify([
        { slug: "camiseta-hamilton", price: TEE, quantity: 1, personalization: { name: "LEWIS", number: "44" } },
        { slug: "bone-hamilton", price: CAP, quantity: 1 },
        { slug: "poster-hamilton", price: POSTER, quantity: 1 },
      ]),
    ]);
    expect(res.rows[0].r.total).toBe(0);
  });
});
