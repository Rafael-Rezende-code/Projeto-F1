import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, createDb, orderPayload } from "./db";
import { computeTotals } from "../../lib/pricing";

// Desconto no Pix (loja extra, item 1a) no banco simulado (PGlite): recalculado na create_order pelo meio de pagamento,
// sobre o subtotal depois do cupom e sem o frete; igual a lib/pricing.ts. Não testado contra o Supabase real.
let db: PGlite;
const PRICE = 64990; // APX-001 (Scuderia Racing Jacket) no seed
type Row = { subtotal_cents: number; discount_cents: number; payment_discount_cents: number; payment_discount_percent: number; total_cents: number; payment_method: string };
const create = async (id: string, extra: Record<string, unknown>) =>
  (await db.query<Row>("select * from create_order($1::jsonb)", [orderPayload(id, [{ sku: "APX-001-M", quantity: 1 }], extra)])).rows[0];

beforeAll(async () => {
  db = await createDb();
  await db.exec(`
    update product_variants set stock = 100 where sku = 'APX-001-M';
    insert into coupons (code, kind, value, min_subtotal_cents, max_uses) values ('DEZ', 'percentual', 10, 0, null);
  `);
  await asRole(db, "service_role");
}, 60_000);

describe("desconto no Pix (banco simulado)", () => {
  it("Pix com 5%: desconto sobre os itens, frete fora; grava meio, percentual e valor", async () => {
    const row = await create("PIX-1", { pix_percent: 5 });
    const expected = computeTotals({ lines: [{ key: "a", sku: "APX-001-M", slug: "x", unitPriceCents: PRICE, feeCents: 0, quantity: 1, personalized: false }], shippingCents: 2490, method: "pix", pixPercent: 5 });
    expect(row).toMatchObject({ payment_method: "pix", payment_discount_percent: 5, payment_discount_cents: expected.pixDiscountCents, total_cents: expected.totalCents });
  });

  it("cartão e boleto não têm desconto, mesmo se o percentual vier", async () => {
    expect(await create("PIX-2", { payment_method: "cartao", pix_percent: 5 })).toMatchObject({ payment_discount_cents: 0, payment_discount_percent: 0, total_cents: PRICE + 2490 });
    expect(await create("PIX-3", { payment_method: "boleto", pix_percent: 5 })).toMatchObject({ payment_discount_cents: 0 });
  });

  it("incide depois do cupom; percentual limitado a 30", async () => {
    const coupon = Math.floor(PRICE * 0.1);
    const row = await create("PIX-4", { pix_percent: 5, coupon: "DEZ" });
    expect(row.payment_discount_cents).toBe(Math.round((PRICE - coupon) * 0.05));
    expect(row.total_cents).toBe(PRICE - coupon - Math.round((PRICE - coupon) * 0.05) + 2490);
    expect((await create("PIX-5", { pix_percent: 90 })).payment_discount_percent).toBe(30);
    expect((await create("PIX-6", {})).payment_discount_cents).toBe(0);
  });
});
