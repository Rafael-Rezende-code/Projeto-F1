import "server-only";
import { catalog } from "@/lib/catalog";
import { slowestDispatch } from "@/lib/catalog/fulfillment";
import { getShippingQuotes } from "@/lib/shipping";
import { deliveryOption, type DeliveryOption } from "./shipping";

export type QuoteResult = { ok: true; options: DeliveryOption[]; subtotalCents: number } | { ok: false; message: string; stockIssues?: { sku: string; available: number }[] };

// Cotação de frete para a sacola (refino 2, item 7), no servidor: preço, pacote e prazo de envio vêm do CATÁLOGO pelo
// SKU (nunca do cliente). Usada pela server action de cotação e de novo pelo placeOrder ao fechar o pedido.
export async function quoteForItems(cep: string, items: { sku: string; quantity: number }[]): Promise<QuoteResult> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return { ok: false, message: "Informe um CEP válido." };
  const lines = [];
  const stockIssues: { sku: string; available: number }[] = [];
  for (const item of items) {
    const found = await catalog.getVariantBySku(item.sku);
    if (!found || found.variant.stock < item.quantity) {
      stockIssues.push({ sku: item.sku, available: found?.variant.stock ?? 0 });
      continue;
    }
    lines.push({ product: found.product, quantity: item.quantity });
  }
  if (stockIssues.length) return { ok: false, message: "Alguns itens não têm mais estoque suficiente.", stockIssues };
  if (!lines.length) return { ok: false, message: "A sacola está vazia." };
  const subtotalCents = lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const quotes = await getShippingQuotes({
    destinationCep: digits,
    subtotalCents,
    items: lines.map((line) => ({ package: line.product.package, quantity: line.quantity, unitPriceCents: line.product.priceCents })),
  });
  const dispatch = slowestDispatch(lines.map((line) => line.product));
  return { ok: true, subtotalCents, options: quotes.map((quote) => deliveryOption(quote, dispatch)) };
}
