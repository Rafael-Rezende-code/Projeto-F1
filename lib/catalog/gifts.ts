import type { Product } from "./types";

// Guia de presentes (/presentes, refino 3, item 1.5): faixas de preço cumulativas ("até") e "acima de". A contagem de
// cada chip e a grade usam os PREÇOS REAIS do catálogo (centavos). Puro e testado (gifts.test.ts).
export const GIFT_BANDS = [
  { value: "ate-100", label: "Até R$ 100", maxCents: 10000 },
  { value: "ate-200", label: "Até R$ 200", maxCents: 20000 },
  { value: "ate-300", label: "Até R$ 300", maxCents: 30000 },
  { value: "acima-300", label: "Acima de R$ 300", minCents: 30001 },
] as const satisfies readonly { value: string; label: string; minCents?: number; maxCents?: number }[];

export type GiftBand = (typeof GIFT_BANDS)[number]["value"];

export const parseGiftBand = (value: string | string[] | undefined): GiftBand | null =>
  GIFT_BANDS.find((band) => band.value === (Array.isArray(value) ? value[0] : value))?.value ?? null;

export function inGiftBand(product: Pick<Product, "priceCents">, band: GiftBand) {
  const found = GIFT_BANDS.find((item) => item.value === band)!;
  const min = "minCents" in found ? found.minCents : 0;
  const max = "maxCents" in found ? found.maxCents : Number.POSITIVE_INFINITY;
  return product.priceCents >= min && product.priceCents <= max;
}

/** Produtos da faixa (ou todos), do mais barato ao mais caro: num guia de presentes o preço vem primeiro. */
export function giftProducts(products: Product[], band: GiftBand | null) {
  return products.filter((product) => !band || inGiftBand(product, band)).sort((a, b) => a.priceCents - b.priceCents);
}

/** Quantos produtos em cada faixa (para os chips; faixa vazia fica desabilitada). */
export const giftBandCounts = (products: Product[]) => GIFT_BANDS.map((band) => ({ ...band, count: products.filter((product) => inGiftBand(product, band.value)).length }));
