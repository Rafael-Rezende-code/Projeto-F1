import { describe, expect, it } from "vitest";
import { applyKits, computeTotals, pixDiscountFor, type KitRule, type PriceLine } from "./pricing";

const line = (slug: string, price: number, quantity = 1, extra: Partial<PriceLine> = {}): PriceLine => ({ key: `${slug}-M`, sku: `${slug}-M`, slug, unitPriceCents: price, feeCents: 0, quantity, personalized: false, ...extra });
const kit: KitRule = { slug: "kit-hamilton", title: "Kit Hamilton", productSlugs: ["camiseta", "bone", "poster"], percent: 10 };

describe("Pix", () => {
  it("desconto sobre itens − kit − cupom, sem o frete, só no Pix", () => {
    expect(pixDiscountFor(20000, 5)).toBe(1000);
    expect(pixDiscountFor(20000, 0)).toBe(0);
    const totals = computeTotals({ lines: [line("camiseta", 20000)], shippingCents: 2490, method: "pix", pixPercent: 5 });
    expect(totals).toMatchObject({ pixDiscountCents: 1000, totalCents: 20000 - 1000 + 2490 });
    expect(computeTotals({ lines: [line("camiseta", 20000)], shippingCents: 2490, method: "cartao", pixPercent: 5 }).pixDiscountCents).toBe(0);
  });

  it("incide depois do cupom", () => {
    const totals = computeTotals({ lines: [line("camiseta", 20000)], coupon: { discountCents: 2000, shippingDiscountCents: 0 }, method: "pix", pixPercent: 5 });
    expect(totals.pixDiscountCents).toBe(900);
    expect(totals.totalCents).toBe(20000 - 2000 - 900);
  });
});

describe("kits", () => {
  it("vale com todos os produtos do kit na sacola (qualquer tamanho); desconto sobre uma unidade de cada", () => {
    const lines = [line("camiseta", 20000), line("bone", 10000), line("poster", 5000)];
    expect(applyKits(lines, [kit])).toEqual([{ slug: "kit-hamilton", title: "Kit Hamilton", sets: 1, discountCents: 3500, lineKeys: ["camiseta-M", "bone-M", "poster-M"] }]);
  });

  it("remover um item tira o desconto", () => {
    expect(applyKits([line("camiseta", 20000), line("bone", 10000)], [kit])).toEqual([]);
  });

  it("dois conjuntos só com duas unidades de cada; item personalizado não entra", () => {
    const two = [line("camiseta", 20000, 2), line("bone", 10000, 2), line("poster", 5000, 3)];
    expect(applyKits(two, [kit])[0]).toMatchObject({ sets: 2, discountCents: 7000 });
    const personalized = [line("camiseta", 20000, 1, { personalized: true, feeCents: 3000, key: "camiseta-M|JOAO|7" }), line("bone", 10000), line("poster", 5000)];
    expect(applyKits(personalized, [kit])).toEqual([]);
  });

  it("kit inativo ou de um produto só não vale", () => {
    const lines = [line("camiseta", 20000), line("bone", 10000), line("poster", 5000)];
    expect(applyKits(lines, [{ ...kit, active: false }])).toEqual([]);
    expect(applyKits(lines, [{ ...kit, productSlugs: ["camiseta"] }])).toEqual([]);
  });

  it("cupom não é cumulativo com kit por padrão (configurável)", () => {
    const lines = [line("camiseta", 20000), line("bone", 10000), line("poster", 5000)];
    const coupon = { discountCents: 1000, shippingDiscountCents: 0 };
    expect(computeTotals({ lines, kits: [kit], coupon })).toMatchObject({ couponBlockedByKit: true, couponDiscountCents: 0, totalCents: 35000 - 3500 });
    expect(computeTotals({ lines, kits: [kit], coupon, couponWithKit: true })).toMatchObject({ couponDiscountCents: 1000, totalCents: 35000 - 3500 - 1000 });
  });

  it("total: kit + Pix + frete", () => {
    const lines = [line("camiseta", 20000), line("bone", 10000), line("poster", 5000)];
    const totals = computeTotals({ lines, kits: [kit], shippingCents: 2490, method: "pix", pixPercent: 5 });
    expect(totals).toMatchObject({ itemsCents: 35000, kitDiscountCents: 3500, pixDiscountCents: 1575, totalCents: 35000 - 3500 - 1575 + 2490 });
  });
});

describe("personalização", () => {
  it("o adicional entra no subtotal (por unidade)", () => {
    const totals = computeTotals({ lines: [line("camiseta", 20000, 2, { feeCents: 3000, personalized: true })] });
    expect(totals).toMatchObject({ itemsCents: 46000, feesCents: 6000, totalCents: 46000 });
  });
});
