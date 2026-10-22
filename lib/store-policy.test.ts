import { describe, expect, it } from "vitest";
import { createStorePolicy, installmentOffer } from "./store-policy";

// Regra da política comercial: SEM configuração, nenhuma promessa existe.
describe("política comercial (lib/store-policy.ts)", () => {
  it("sem variáveis, nada é prometido", () => {
    const policy = createStorePolicy({});
    expect(policy).toEqual({
      installments: { max: null, interestFree: false, minInstallmentCents: null },
      freeShippingFromCents: null,
      shippingNote: null,
      returnsNote: null,
      warrantyNote: null,
      deliveryArea: null,
      emailNotifications: false,
    });
    expect(installmentOffer(64990, policy)).toBeNull();
  });

  it("valores inválidos, zero ou vazios contam como não configurados", () => {
    const policy = createStorePolicy({ NEXT_PUBLIC_INSTALLMENTS_MAX: "abc", NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS: "0", NEXT_PUBLIC_POLICY_RETURNS_NOTE: "   ", NEXT_PUBLIC_POLICY_WARRANTY_NOTE: "-3" });
    expect(policy.installments.max).toBeNull();
    expect(policy.freeShippingFromCents).toBeNull();
    expect(policy.returnsNote).toBeNull();
    expect(policy.warrantyNote).toBe("-3"); // texto livre: só vazio é "não configurado"
  });

  it("parcelas só são anunciadas se forem SEM JUROS e houver um máximo de 2 ou mais", () => {
    expect(installmentOffer(64990, createStorePolicy({ NEXT_PUBLIC_INSTALLMENTS_MAX: "3" }))).toBeNull(); // com juros: valor da parcela depende do cartão
    expect(installmentOffer(64990, createStorePolicy({ NEXT_PUBLIC_INSTALLMENTS_MAX: "1", NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE: "true" }))).toBeNull();
    expect(installmentOffer(64990, createStorePolicy({ NEXT_PUBLIC_INSTALLMENTS_MAX: "3", NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE: "true" }))).toEqual({ count: 3, amountCents: 21664 });
    expect(installmentOffer(64990, createStorePolicy({ NEXT_PUBLIC_INSTALLMENTS_MAX: "3", NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE: "sim" }))).toBeNull(); // só "true"
  });

  it("valor mínimo da parcela reduz o número de parcelas (e some se não couberem 2)", () => {
    const policy = createStorePolicy({ NEXT_PUBLIC_INSTALLMENTS_MAX: "6", NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE: "true", NEXT_PUBLIC_INSTALLMENT_MIN_CENTS: "10000" });
    expect(installmentOffer(45000, policy)).toEqual({ count: 4, amountCents: 11250 });
    expect(installmentOffer(15000, policy)).toBeNull();
  });

  it("frete grátis, notas e área de entrega vêm do ambiente", () => {
    const policy = createStorePolicy({
      NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS: "29900",
      NEXT_PUBLIC_POLICY_SHIPPING_NOTE: "Postamos em até 2 dias úteis.",
      NEXT_PUBLIC_POLICY_RETURNS_NOTE: "Trocas em até 7 dias.",
      NEXT_PUBLIC_POLICY_DELIVERY_AREA: "Entregamos em todo o Brasil.",
    });
    expect(createStorePolicy({ NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS: "true" }).emailNotifications).toBe(true);
    expect(createStorePolicy({ NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS: "1" }).emailNotifications).toBe(false);
    expect(policy).toMatchObject({ freeShippingFromCents: 29900, shippingNote: "Postamos em até 2 dias úteis.", returnsNote: "Trocas em até 7 dias.", deliveryArea: "Entregamos em todo o Brasil.", warrantyNote: null });
  });
});
