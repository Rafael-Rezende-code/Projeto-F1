import { describe, expect, it } from "vitest";
import { computeCouponDiscount, couponMessage, normalizeCouponCode } from "./coupons";

describe("cupons (regras puras)", () => {
  it("normaliza o código (maiúsculas, sem espaços) e recusa formato inválido", () => {
    expect(normalizeCouponCode(" volta10 ")).toBe("VOLTA10");
    expect(normalizeCouponCode("bem vindo")).toBe("BEMVINDO");
    expect(normalizeCouponCode("ab")).toBeNull();
    expect(normalizeCouponCode("cupom!")).toBeNull();
  });

  it("percentual arredonda para baixo; valor fixo limitado ao subtotal; frete grátis só no frete", () => {
    expect(computeCouponDiscount({ kind: "percentual", value: 10 }, 64990)).toEqual({ discountCents: 6499, shippingDiscountCents: 0 });
    expect(computeCouponDiscount({ kind: "valor_fixo", value: 99999 }, 5000)).toEqual({ discountCents: 5000, shippingDiscountCents: 0 });
    expect(computeCouponDiscount({ kind: "frete_gratis", value: 0 }, 5000, 2490)).toEqual({ discountCents: 0, shippingDiscountCents: 2490 });
    expect(computeCouponDiscount({ kind: "percentual", value: 100 }, 1234).discountCents).toBe(1234);
  });

  it("mensagens claras por motivo", () => {
    expect(couponMessage("expirado")).toBe("Este cupom expirou.");
    expect(couponMessage("esgotado")).toMatch(/máximo de vezes/);
    expect(couponMessage("qualquer")).toMatch(/não encontrado/);
  });
});
