import { describe, expect, it } from "vitest";
import { ga4Payload, pixelPayload, track } from "./analytics";
import { parseConsent, trackingConfigured } from "./consent";

const item = { id: "APX-001", name: "Jaqueta", priceCents: 64990, quantity: 2, variant: "M" };

describe("analytics", () => {
  it("GA4: nomes e formatos do e-commerce (BRL, reais)", () => {
    expect(ga4Payload({ name: "add_to_cart", item })).toEqual(["add_to_cart", { currency: "BRL", value: 1299.8, items: [{ item_id: "APX-001", item_name: "Jaqueta", price: 649.9, quantity: 2, item_variant: "M" }] }]);
    expect(ga4Payload({ name: "purchase", transactionId: "APX-1", items: [item], valueCents: 132470, shippingCents: 2490 })[1]).toMatchObject({ transaction_id: "APX-1", value: 1324.7, shipping: 24.9 });
    expect(ga4Payload({ name: "search", term: "ferrari" })).toEqual(["search", { search_term: "ferrari" }]);
  });

  it("Meta Pixel: eventos padrão", () => {
    expect(pixelPayload({ name: "view_item", item })[0]).toBe("ViewContent");
    expect(pixelPayload({ name: "begin_checkout", items: [item], valueCents: 129980 })[1]).toMatchObject({ num_items: 2, value: 1299.8 });
    expect(pixelPayload({ name: "purchase", transactionId: "x", items: [item], valueCents: 100, shippingCents: 0 })[0]).toBe("Purchase");
  });

  it("sem IDs: nada é configurado e track não faz nada (nem fora do navegador)", () => {
    expect(trackingConfigured("", "")).toBe(false);
    expect(trackingConfigured("G-X", "")).toBe(true);
    expect(() => track({ name: "search", term: "x" })).not.toThrow();
  });

  it("consentimento: só aceita o formato da versão atual", () => {
    expect(parseConsent('{"version":1,"analytics":true,"marketing":false,"date":"d"}')).toEqual({ version: 1, analytics: true, marketing: false, date: "d" });
    expect(parseConsent('{"version":0,"analytics":true,"marketing":true}')).toBeNull();
    expect(parseConsent("lixo")).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });
});
