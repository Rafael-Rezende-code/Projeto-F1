import { describe, expect, it } from "vitest";
import { giftBandCounts, giftProducts, inGiftBand, parseGiftBand } from "./gifts";
import { products } from "./seed/products";
import type { Product } from "./types";

const at = (priceCents: number) => ({ id: String(priceCents), priceCents }) as Product;

describe("guia de presentes", () => {
  it("faixas cumulativas pelos preços reais; acima de 300 começa em R$ 300,01", () => {
    expect(inGiftBand(at(10000), "ate-100")).toBe(true);
    expect(inGiftBand(at(10001), "ate-100")).toBe(false);
    expect(inGiftBand(at(9990), "ate-200")).toBe(true);
    expect(inGiftBand(at(30000), "ate-300")).toBe(true);
    expect(inGiftBand(at(30000), "acima-300")).toBe(false);
    expect(inGiftBand(at(30001), "acima-300")).toBe(true);
  });

  it("lista do mais barato ao mais caro; sem faixa, tudo", () => {
    const list = [at(50000), at(9990), at(19990)];
    expect(giftProducts(list, "ate-200").map((p) => p.priceCents)).toEqual([9990, 19990]);
    expect(giftProducts(list, null)).toHaveLength(3);
  });

  it("parâmetro da URL desconhecido é ignorado", () => {
    expect(parseGiftBand("ate-200")).toBe("ate-200");
    expect(parseGiftBand("ate-50")).toBeNull();
    expect(parseGiftBand(undefined)).toBeNull();
  });

  it("no seed, toda faixa tem produto e as contagens batem com a grade", () => {
    for (const band of giftBandCounts(products)) {
      expect(band.count).toBeGreaterThan(0);
      expect(band.count).toBe(giftProducts(products, band.value).length);
    }
  });
});
