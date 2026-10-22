import { describe, expect, it } from "vitest";
import { netMargin, roundToNinety, suggestedPrice } from "./pricing";

const params = { feePercent: 5, feeFixedCents: 0, taxPercent: 0, marginPercent: 35 };

describe("calculadora de preço", () => {
  it("preço sugerido atinge a margem desejada", () => {
    const input = { costCents: 10000, supplierShippingCents: 2000 };
    const price = suggestedPrice(input, params)!;
    // 120,00 / 0,60 = 200,00 → 200,90
    expect(price).toBe(20090);
    expect(netMargin(price, input, params).percent).toBeGreaterThanOrEqual(35);
  });

  it("margem líquida desconta custo, frete do fornecedor, taxas e impostos", () => {
    const result = netMargin(20000, { costCents: 10000, supplierShippingCents: 2000 }, { ...params, taxPercent: 6, feeFixedCents: 100 });
    // 200 − 100 − 20 − 22 (11%) − 1 = 57
    expect(result.cents).toBe(5700);
    expect(result.percent).toBeCloseTo(28.5);
  });

  it("porcentagens que somam 100% não têm preço possível", () => {
    expect(suggestedPrice({ costCents: 1, supplierShippingCents: 0 }, { ...params, marginPercent: 95 })).toBeNull();
  });

  it("arredonda para ,90", () => {
    expect(roundToNinety(18732)).toBe(18790);
    expect(roundToNinety(18790)).toBe(18790);
    expect(roundToNinety(18795)).toBe(18890);
  });
});
