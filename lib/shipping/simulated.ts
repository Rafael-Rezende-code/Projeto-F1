import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/cart/config";
import { combinePackages } from "@/lib/catalog/fulfillment";
import type { ShippingProvider, ShippingQuote, ShippingQuoteRequest } from "./types";

// Frete SIMULADO (sem transportadora): tabela por REGIÃO do CEP de destino (a partir de MG, onde a loja fica) e por PESO.
// Econômica e Expressa; a Econômica é grátis a partir do limite de frete grátis. Valores de EXEMPLO (docs/backend/frete.md).

type Zone = { name: string; economica: Rate; expressa: Rate };
type Rate = { baseCents: number; perKgCents: number; days: { min: number; max: number } };

// 1º dígito do CEP → zona. 3 = MG; 0, 1 = SP; 2 = RJ/ES; 8 = PR/SC; 9 = RS; 7 = DF/GO/TO/MT/RO/MS; 4 = BA/SE;
// 5 = PE/AL/PB/RN; 6 = CE/PI/MA/PA/AP/AM/RR/AC.
const ZONES: Record<string, Zone> = {
  mg: { name: "Minas Gerais", economica: { baseCents: 1990, perKgCents: 300, days: { min: 2, max: 4 } }, expressa: { baseCents: 3490, perKgCents: 500, days: { min: 1, max: 2 } } },
  sudeste: { name: "Sudeste", economica: { baseCents: 2290, perKgCents: 400, days: { min: 3, max: 6 } }, expressa: { baseCents: 3990, perKgCents: 600, days: { min: 1, max: 3 } } },
  sulco: { name: "Sul e Centro-Oeste", economica: { baseCents: 2690, perKgCents: 500, days: { min: 4, max: 8 } }, expressa: { baseCents: 4990, perKgCents: 800, days: { min: 2, max: 4 } } },
  nordeste: { name: "Nordeste", economica: { baseCents: 3290, perKgCents: 700, days: { min: 6, max: 12 } }, expressa: { baseCents: 6490, perKgCents: 1000, days: { min: 3, max: 6 } } },
  norte: { name: "Norte", economica: { baseCents: 3990, perKgCents: 900, days: { min: 8, max: 15 } }, expressa: { baseCents: 7990, perKgCents: 1200, days: { min: 4, max: 8 } } },
};
const ZONE_BY_DIGIT: Record<string, keyof typeof ZONES> = { "0": "sudeste", "1": "sudeste", "2": "sudeste", "3": "mg", "4": "nordeste", "5": "nordeste", "6": "norte", "7": "sulco", "8": "sulco", "9": "sulco" };

export const zoneOf = (cep: string) => ZONES[ZONE_BY_DIGIT[cep.replace(/\D/g, "")[0] ?? "0"] ?? "sudeste"];

/** Peso cobrado: o maior entre o real e o cúbico (C × L × A / 6000, em kg), arredondado para cima em kg (mínimo 1). */
export function chargeableKg(pkg: { weightGrams: number; lengthCm: number; widthCm: number; heightCm: number }) {
  const real = pkg.weightGrams / 1000;
  const cubic = (pkg.lengthCm * pkg.widthCm * pkg.heightCm) / 6000;
  return Math.max(1, Math.ceil(Math.max(real, cubic)));
}

export function simulatedQuotes(request: ShippingQuoteRequest, freeThresholdCents = FREE_SHIPPING_THRESHOLD_CENTS): ShippingQuote[] {
  const zone = zoneOf(request.destinationCep);
  const kg = chargeableKg(combinePackages(request.items));
  const price = (rate: Rate) => rate.baseCents + rate.perKgCents * (kg - 1);
  const economica = price(zone.economica);
  const free = request.subtotalCents >= freeThresholdCents;
  return [
    { id: "economica", label: "Econômica", transitDays: zone.economica.days, priceCents: free ? 0 : economica, fullPriceCents: economica },
    { id: "expressa", label: "Expressa", transitDays: zone.expressa.days, priceCents: price(zone.expressa) },
  ];
}

export class SimulatedShippingProvider implements ShippingProvider {
  readonly id = "simulado";
  async quote(request: ShippingQuoteRequest) {
    return simulatedQuotes(request);
  }
}
