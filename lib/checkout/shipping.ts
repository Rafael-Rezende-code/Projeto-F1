import { daysLabel } from "@/lib/catalog/fulfillment";
import type { DispatchDays } from "@/lib/catalog/types";
import type { ShippingQuote } from "@/lib/shipping/types";

// Opção de entrega mostrada no checkout (refino 2, item 7): a cotação do frete (lib/shipping, só no servidor) + o
// prazo de ENVIO do item mais lento da sacola. "Chega em" = envio + transporte, em dias úteis. Função pura (cliente e
// servidor).
export type DeliveryOption = ShippingQuote & {
  /** Texto do prazo total, ex.: "Chega em 3 a 8 dias úteis". */
  days: string;
  totalDays: { min: number; max: number };
};

export function deliveryOption(quote: ShippingQuote, dispatch: DispatchDays): DeliveryOption {
  const totalDays = { min: dispatch.min + quote.transitDays.min, max: dispatch.max + quote.transitDays.max };
  return { ...quote, totalDays, days: `Chega em ${daysLabel(totalDays)}` };
}
