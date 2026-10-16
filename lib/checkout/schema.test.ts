import { describe, expect, it } from "vitest";
import { checkoutSchema, contactSchema, paymentSchema } from "./schema";

// CPF só no boleto (boleto registrado). Pix e cartão não pedem; o contato não tem CPF.
describe("CPF no checkout", () => {
  it("contato válido sem CPF", () => {
    expect(contactSchema.safeParse({ name: "Ana Souza", email: "ana@exemplo.com", phone: "(11) 91234-5678" }).success).toBe(true);
  });

  it("Pix e cartão não exigem CPF", () => {
    expect(paymentSchema.safeParse({ method: "pix", acceptTerms: true }).success).toBe(true);
    expect(paymentSchema.safeParse({ method: "cartao", acceptTerms: true }).success).toBe(true);
  });

  it("boleto exige CPF", () => {
    const result = paymentSchema.safeParse({ method: "boleto", acceptTerms: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["cpf"], message: "Informe o CPF para emitir o boleto." });
  });

  it("boleto recusa CPF com dígitos verificadores errados", () => {
    const result = paymentSchema.safeParse({ method: "boleto", cpf: "529.982.247-24", acceptTerms: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("CPF inválido. Confira os números.");
  });

  it("boleto aceita CPF válido (com ou sem máscara)", () => {
    expect(paymentSchema.safeParse({ method: "boleto", cpf: "529.982.247-25", acceptTerms: true }).success).toBe(true);
    expect(paymentSchema.safeParse({ method: "boleto", cpf: "52998224725", acceptTerms: true }).success).toBe(true);
  });

  it("pedido inteiro (servidor) valida o CPF do boleto", () => {
    const base = {
      contact: { name: "Ana Souza", email: "ana@exemplo.com", phone: "(11) 91234-5678" },
      address: { cep: "01310-100", street: "Avenida Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "SP" },
      shipping: { shippingId: "economica" },
      items: [{ sku: "X-1", quantity: 1 }],
    };
    expect(checkoutSchema.safeParse({ ...base, payment: { method: "pix", acceptTerms: true } }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, payment: { method: "boleto", acceptTerms: true } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, payment: { method: "boleto", cpf: "52998224725", acceptTerms: true } }).success).toBe(true);
  });
});
