import type { ShippingQuote, ShippingQuoteRequest } from "./types";

// Melhor Envio, parte PURA (testes em melhor-envio.test.ts): monta o corpo da cotação e lê a resposta.
// API: POST {base}/api/v2/me/shipment/calculate (docs/backend/frete.md). Medidas em cm, peso em KG.

export type MelhorEnvioService = {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  delivery_range?: { min: number; max: number };
  custom_delivery_range?: { min: number; max: number };
  company?: { id: number; name: string };
  error?: string;
};

export function melhorEnvioBody(request: ShippingQuoteRequest, originCep: string, insurance = true) {
  return {
    from: { postal_code: originCep },
    to: { postal_code: request.destinationCep.replace(/\D/g, "") },
    products: request.items.map((item, index) => ({
      id: String(index + 1),
      width: item.package.widthCm,
      height: item.package.heightCm,
      length: item.package.lengthCm,
      weight: item.package.weightGrams / 1000,
      insurance_value: insurance ? item.unitPriceCents / 100 : 0,
      quantity: item.quantity,
    })),
    options: { receipt: false, own_hand: false },
  };
}

const toCents = (value?: string) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
};

/** Resposta → opções. Ignora serviços com erro (ex.: "Transportadora não atende este trecho") ou sem preço. */
export function parseMelhorEnvio(services: MelhorEnvioService[], allowed: string[] = []): ShippingQuote[] {
  const quotes: ShippingQuote[] = [];
  for (const service of Array.isArray(services) ? services : []) {
    if (service.error || (allowed.length && !allowed.includes(String(service.id)))) continue;
    const price = toCents(service.custom_price ?? service.price);
    const range = service.custom_delivery_range ?? service.delivery_range ?? (service.delivery_time ? { min: service.delivery_time, max: service.delivery_time } : null);
    if (price === null || !range) continue;
    quotes.push({
      id: `melhorenvio-${service.id}`,
      label: service.company?.name ? `${service.company.name} ${service.name}` : service.name,
      carrier: service.company?.name,
      transitDays: { min: range.min, max: range.max },
      priceCents: price,
      fullPriceCents: price,
    });
  }
  return quotes.sort((a, b) => a.priceCents - b.priceCents);
}
