import { describe, expect, it } from "vitest";
import { combinePackages, daysLabel, dispatchNotice, dispatchSummary, hasMixedDispatch, slowestDispatch } from "./fulfillment";
import { seedData } from "./seed-repository";

describe("modelo de venda", () => {
  it("rótulo de dias úteis", () => {
    expect(daysLabel({ min: 3, max: 5 })).toBe("3 a 5 dias úteis");
    expect(daysLabel({ min: 1, max: 1 })).toBe("1 dia útil");
    expect(daysLabel({ min: 2, max: 2 })).toBe("2 dias úteis");
  });

  it("aviso na página de produto: só sob encomenda ou prazo acima do padrão", () => {
    expect(dispatchNotice({ fulfillment: "estoque_proprio", dispatchDays: { min: 1, max: 2 }, origin: "nacional" })).toBeNull();
    expect(dispatchNotice({ fulfillment: "sob_encomenda", dispatchDays: { min: 15, max: 30 }, origin: "importado" })).toEqual({ madeToOrder: true, imported: true, text: "Envio estimado em 15 a 30 dias úteis" });
    expect(dispatchNotice({ fulfillment: "estoque_proprio", dispatchDays: { min: 4, max: 6 }, origin: "nacional" })?.madeToOrder).toBe(false);
  });

  it("prazo do pedido = item mais lento; aviso de pacotes separados quando os prazos diferem", () => {
    const fast = { dispatchDays: { min: 1, max: 2 } };
    const slow = { dispatchDays: { min: 15, max: 30 } };
    expect(slowestDispatch([fast, slow, fast])).toEqual({ min: 15, max: 30 });
    expect(hasMixedDispatch([fast, fast])).toBe(false);
    expect(hasMixedDispatch([fast, slow])).toBe(true);
    expect(dispatchSummary([fast, slow])).toMatchObject({ range: "15 a 30 dias úteis", split: true });
    // item antigo da sacola, sem prazo: usa o padrão
    expect(slowestDispatch([{}])).toEqual({ min: 1, max: 3 });
    expect(dispatchSummary([])).toBeNull();
  });

  it("pacote combinado soma peso e altura", () => {
    const pkg = { weightGrams: 250, lengthCm: 30, widthCm: 25, heightCm: 3 };
    expect(combinePackages([{ package: pkg, quantity: 2 }, { package: { ...pkg, lengthCm: 40 }, quantity: 1 }])).toEqual({ weightGrams: 750, lengthCm: 40, widthCm: 25, heightCm: 9 });
  });

  it("seed: todo produto tem modelo de venda válido e nenhum dado privado", () => {
    for (const product of seedData.products) {
      expect(["estoque_proprio", "sob_encomenda"]).toContain(product.fulfillment);
      expect(product.dispatchDays.max).toBeGreaterThanOrEqual(product.dispatchDays.min);
      expect(product.package.weightGrams).toBeGreaterThan(0);
      for (const secret of ["cost", "costCents", "supplier", "supplierUrl", "notes"]) expect(product).not.toHaveProperty(secret);
    }
    expect(seedData.products.some((product) => product.fulfillment === "sob_encomenda")).toBe(true);
  });
});
