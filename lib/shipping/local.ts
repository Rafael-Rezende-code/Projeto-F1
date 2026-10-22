import { LOCAL_DELIVERY } from "./config";
import type { ShippingQuote, ShippingQuoteRequest } from "./types";

// Entrega local (São Sebastião do Paraíso, MG e região) por faixa de CEP. Configuração em ./config.ts.
export function localRangeOf(cep: string, config = LOCAL_DELIVERY) {
  const digits = cep.replace(/\D/g, "");
  if (!config.enabled || digits.length !== 8) return null;
  return config.ranges.find((range) => digits >= range.from && digits <= range.to) ?? null;
}

export function localQuote(request: ShippingQuoteRequest, config = LOCAL_DELIVERY): ShippingQuote | null {
  const range = localRangeOf(request.destinationCep, config);
  if (!range) return null;
  const free = config.freeFromCents !== null && request.subtotalCents >= config.freeFromCents;
  return {
    id: "local",
    label: config.label,
    carrier: range.name,
    transitDays: config.transitDays,
    priceCents: free ? 0 : config.priceCents,
    fullPriceCents: config.priceCents,
  };
}
