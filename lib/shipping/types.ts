import type { ProductPackage } from "@/lib/catalog/types";

// Frete (refino 2, item 7). Um ShippingProvider recebe o CEP de destino e os pacotes da sacola e devolve as opções.
// Prazos em DIAS ÚTEIS de TRANSPORTE (depois da postagem); o prazo de envio de cada produto (lib/catalog/fulfillment)
// é somado à parte. Guia em docs/backend/frete.md.

export type ShippingItem = { package: ProductPackage; quantity: number; unitPriceCents: number };

export type ShippingQuoteRequest = {
  /** Só dígitos (8). */
  destinationCep: string;
  items: ShippingItem[];
  subtotalCents: number;
};

export type ShippingQuote = {
  /** Estável entre a cotação e o pedido ("economica", "expressa", "local", "melhorenvio-3"...). */
  id: string;
  label: string;
  /** Transportadora/serviço, quando houver (Melhor Envio). */
  carrier?: string;
  transitDays: { min: number; max: number };
  priceCents: number;
  /** Preço de tabela antes do frete grátis (para mostrar "grátis"). */
  fullPriceCents?: number;
};

export interface ShippingProvider {
  readonly id: string;
  quote(request: ShippingQuoteRequest): Promise<ShippingQuote[]>;
}
