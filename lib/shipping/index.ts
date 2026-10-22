import "server-only";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/cart/config";
import { isMelhorEnvioConfigured } from "./config";
import { localQuote } from "./local";
import { MelhorEnvioProvider } from "./melhor-envio";
import { SimulatedShippingProvider } from "./simulated";
import type { ShippingProvider, ShippingQuote, ShippingQuoteRequest } from "./types";

// Frete da loja (refino 2, item 7): entrega local (se o CEP estiver na faixa) + o provedor principal (Melhor Envio com
// token; senão, o simulado). Se o Melhor Envio falhar, cai no simulado para o checkout não travar. Só no servidor: o
// checkout cota por uma server action e o pedido cota DE NOVO na hora de fechar (não confia no preço do cliente).
export const getShippingProvider = (): ShippingProvider => (isMelhorEnvioConfigured() ? new MelhorEnvioProvider() : new SimulatedShippingProvider());

export async function getShippingQuotes(request: ShippingQuoteRequest): Promise<ShippingQuote[]> {
  const provider = getShippingProvider();
  let quotes: ShippingQuote[];
  try {
    quotes = await provider.quote(request);
    // Frete grátis no Melhor Envio: a opção mais barata sai grátis acima do limite (como a Econômica do simulado).
    if (provider.id === "melhorenvio" && quotes.length && FREE_SHIPPING_THRESHOLD_CENTS !== null && request.subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) quotes[0] = { ...quotes[0], priceCents: 0 };
  } catch (error) {
    console.error("[frete]", error instanceof Error ? error.message : error);
    quotes = await new SimulatedShippingProvider().quote(request);
  }
  if (!quotes.length) quotes = await new SimulatedShippingProvider().quote(request);
  const local = localQuote(request);
  return local ? [local, ...quotes] : quotes;
}

export type { ShippingQuote, ShippingQuoteRequest } from "./types";
