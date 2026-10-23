import { GA_ID, META_PIXEL_ID, readConsent, trackingConfigured } from "@/lib/consent";

// Eventos de comércio (operação, fase 4): view_item, add_to_cart, begin_checkout, purchase e search. NO-OP sem
// NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_META_PIXEL_ID, e também sem o consentimento da categoria (medição → GA4; marketing →
// Meta Pixel). Os scripts só são carregados depois do consentimento (components/analytics-scripts.tsx). Nenhum dado
// pessoal vai nos eventos (sem nome, e-mail, endereço, CPF). Mapeamento puro testado em analytics.test.ts.
export type AnalyticsItem = { id: string; name: string; priceCents: number; quantity?: number; category?: string; variant?: string };
export type AnalyticsEvent =
  | { name: "view_item"; item: AnalyticsItem }
  | { name: "add_to_cart"; item: AnalyticsItem }
  | { name: "begin_checkout"; items: AnalyticsItem[]; valueCents: number }
  | { name: "purchase"; transactionId: string; items: AnalyticsItem[]; valueCents: number; shippingCents: number }
  | { name: "search"; term: string };

const money = (cents: number) => Math.round(cents) / 100;
const gaItem = (item: AnalyticsItem) => ({
  item_id: item.id,
  item_name: item.name,
  price: money(item.priceCents),
  quantity: item.quantity ?? 1,
  ...(item.category ? { item_category: item.category } : {}),
  ...(item.variant ? { item_variant: item.variant } : {}),
});
const itemsValue = (items: AnalyticsItem[]) => money(items.reduce((sum, item) => sum + item.priceCents * (item.quantity ?? 1), 0));

export function ga4Payload(event: AnalyticsEvent): [string, Record<string, unknown>] {
  switch (event.name) {
    case "view_item":
    case "add_to_cart":
      return [event.name, { currency: "BRL", value: itemsValue([event.item]), items: [gaItem(event.item)] }];
    case "begin_checkout":
      return [event.name, { currency: "BRL", value: money(event.valueCents), items: event.items.map(gaItem) }];
    case "purchase":
      return [event.name, { currency: "BRL", transaction_id: event.transactionId, value: money(event.valueCents), shipping: money(event.shippingCents), items: event.items.map(gaItem) }];
    case "search":
      return [event.name, { search_term: event.term }];
  }
}

export function pixelPayload(event: AnalyticsEvent): [string, Record<string, unknown>] {
  const contents = (items: AnalyticsItem[]) => items.map((item) => ({ id: item.id, quantity: item.quantity ?? 1, item_price: money(item.priceCents) }));
  switch (event.name) {
    case "view_item":
      return ["ViewContent", { content_type: "product", content_ids: [event.item.id], content_name: event.item.name, value: itemsValue([event.item]), currency: "BRL" }];
    case "add_to_cart":
      return ["AddToCart", { content_type: "product", content_ids: [event.item.id], contents: contents([event.item]), value: itemsValue([event.item]), currency: "BRL" }];
    case "begin_checkout":
      return ["InitiateCheckout", { content_type: "product", contents: contents(event.items), num_items: event.items.reduce((n, item) => n + (item.quantity ?? 1), 0), value: money(event.valueCents), currency: "BRL" }];
    case "purchase":
      return ["Purchase", { content_type: "product", contents: contents(event.items), value: money(event.valueCents), currency: "BRL" }];
    case "search":
      return ["Search", { search_string: event.term }];
  }
}

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined" || !trackingConfigured()) return;
  const consent = readConsent();
  if (!consent) return;
  try {
    const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
    if (GA_ID && consent.analytics && w.gtag) w.gtag("event", ...ga4Payload(event));
    if (META_PIXEL_ID && consent.marketing && w.fbq) w.fbq("track", ...pixelPayload(event));
  } catch {
    // medição nunca quebra a loja
  }
}
