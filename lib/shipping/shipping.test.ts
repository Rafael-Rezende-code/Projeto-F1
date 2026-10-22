import { describe, expect, it } from "vitest";
import { LOCAL_DELIVERY } from "./config";
import { localQuote, localRangeOf } from "./local";
import { melhorEnvioBody, parseMelhorEnvio } from "./melhor-envio-core";
import { chargeableKg, simulatedQuotes, zoneOf } from "./simulated";

const pkg = { weightGrams: 250, lengthCm: 30, widthCm: 25, heightCm: 3 };
const request = (cep: string, subtotalCents = 10000, quantity = 1) => ({ destinationCep: cep, subtotalCents, items: [{ package: pkg, quantity, unitPriceCents: 10000 }] });

describe("frete simulado", () => {
  it("região pelo CEP (a partir de MG)", () => {
    expect(zoneOf("37950000").name).toBe("Minas Gerais");
    expect(zoneOf("01310100").name).toBe("Sudeste");
    expect(zoneOf("69000000").name).toBe("Norte");
    expect(zoneOf("40000000").name).toBe("Nordeste");
  });

  it("mais longe e mais pesado custa mais", () => {
    const [mg] = simulatedQuotes(request("30100000"));
    const [norte] = simulatedQuotes(request("69000000"));
    expect(norte.priceCents).toBeGreaterThan(mg.priceCents);
    expect(norte.transitDays.max).toBeGreaterThan(mg.transitDays.max);
    const [heavy] = simulatedQuotes({ ...request("30100000"), items: [{ package: { ...pkg, weightGrams: 3500 }, quantity: 1, unitPriceCents: 1 }] });
    expect(heavy.priceCents).toBeGreaterThan(mg.priceCents);
  });

  it("peso cobrado considera o cúbico e arredonda para cima", () => {
    expect(chargeableKg({ weightGrams: 300, lengthCm: 10, widthCm: 10, heightCm: 10 })).toBe(1);
    expect(chargeableKg({ weightGrams: 900, lengthCm: 62, widthCm: 40, heightCm: 20 })).toBe(9);
  });

  it("Econômica grátis acima do limite; Expressa nunca", () => {
    const [economica, expressa] = simulatedQuotes(request("01310100", 30000), 29900);
    expect(economica.priceCents).toBe(0);
    expect(economica.fullPriceCents).toBeGreaterThan(0);
    expect(expressa.priceCents).toBeGreaterThan(0);
  });
});

describe("entrega local", () => {
  const configured = { enabled: true, label: "Entrega local", description: "", ranges: [{ from: "37950000", to: "37959999", name: "SSP" }], priceCents: 1000, freeFromCents: null, transitDays: { min: 1, max: 2 } };

  it("só na faixa de CEP configurada", () => {
    expect(localRangeOf("37950-000", configured)).not.toBeNull();
    expect(localRangeOf("37960000", configured)).toBeNull();
    expect(localQuote(request("01310100"), configured)).toBeNull();
    expect(localQuote(request("37950123"), configured)).toMatchObject({ id: "local", transitDays: { min: 1, max: 2 }, priceCents: 1000 });
  });

  it("sem configuração (variáveis LOCAL_DELIVERY_*) a entrega local NÃO existe: nem preço nem prazo são prometidos", () => {
    expect(LOCAL_DELIVERY.enabled).toBe(false);
    expect(localRangeOf("37950000")).toBeNull();
    expect(localQuote(request("37950123"))).toBeNull();
  });

  it("sem limite de frete grátis configurado, nenhuma cotação sai grátis", () => {
    const [economica] = simulatedQuotes(request("01310100", 99999999), null);
    expect(economica.priceCents).toBeGreaterThan(0);
    expect(localQuote(request("37950000", 99999999), configured)?.priceCents).toBe(1000);
  });

  it("preço configurável e grátis a partir do valor definido", () => {
    const config = { enabled: true, label: "Entrega local", description: "", ranges: [{ from: "37950000", to: "37959999", name: "SSP" }], priceCents: 1200, freeFromCents: 20000, transitDays: { min: 0, max: 1 } };
    expect(localQuote(request("37950000", 10000), config)?.priceCents).toBe(1200);
    expect(localQuote(request("37950000", 20000), config)?.priceCents).toBe(0);
    expect(localQuote(request("37950000"), { ...config, enabled: false })).toBeNull();
  });
});

describe("Melhor Envio", () => {
  it("corpo da cotação: medidas em cm, peso em kg, seguro pelo preço", () => {
    const body = melhorEnvioBody(request("01310-100", 10000, 2), "37950000");
    expect(body.from.postal_code).toBe("37950000");
    expect(body.to.postal_code).toBe("01310100");
    expect(body.products[0]).toMatchObject({ weight: 0.25, length: 30, width: 25, height: 3, quantity: 2, insurance_value: 100 });
  });

  it("resposta: ignora erros e serviços fora da lista; usa preço e prazo personalizados", () => {
    const quotes = parseMelhorEnvio([
      { id: 1, name: "PAC", price: "25.10", custom_price: "23.40", delivery_range: { min: 5, max: 7 }, custom_delivery_range: { min: 6, max: 8 }, company: { id: 1, name: "Correios" } },
      { id: 2, name: "SEDEX", price: "48.00", delivery_range: { min: 1, max: 2 }, company: { id: 1, name: "Correios" } },
      { id: 3, name: ".Package", error: "Transportadora não atende este trecho." },
    ]);
    expect(quotes).toEqual([
      { id: "melhorenvio-1", label: "Correios PAC", carrier: "Correios", transitDays: { min: 6, max: 8 }, priceCents: 2340, fullPriceCents: 2340 },
      { id: "melhorenvio-2", label: "Correios SEDEX", carrier: "Correios", transitDays: { min: 1, max: 2 }, priceCents: 4800, fullPriceCents: 4800 },
    ]);
    expect(parseMelhorEnvio([{ id: 1, name: "PAC", price: "10", delivery_time: 5 }], ["2"])).toEqual([]);
  });
});
