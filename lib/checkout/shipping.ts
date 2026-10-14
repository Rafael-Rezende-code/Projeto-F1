import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/cart/config";

// Opções de entrega SIMULADAS (sem transportadora real). Para integrar Correios/Melhor Envio, trocar por uma
// cotação no servidor a partir do CEP e do peso/dimensões dos itens.
export type ShippingOption = { id: "economica" | "expressa"; label: string; days: string; priceCents: number; freeEligible: boolean };

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "economica", label: "Econômica", days: "7 a 10 dias úteis", priceCents: 2490, freeEligible: true },
  { id: "expressa", label: "Expressa", days: "2 a 4 dias úteis", priceCents: 4990, freeEligible: false },
];

/** Preço da opção para um subtotal: a econômica é grátis a partir do limite de frete grátis. */
export function shippingPrice(option: ShippingOption, subtotalCents: number) {
  return option.freeEligible && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : option.priceCents;
}

export const getShippingOption = (id: string) => SHIPPING_OPTIONS.find((option) => option.id === id);
