import { collections, type Collection, type CollectionFilters } from "@/lib/content/collections";
import type { Product } from "./types";

// Regras das coleções (refino 3, item 1.4), puras e testadas (collections.test.ts). Os dados ficam em
// lib/content/collections.ts. Valem para o seed e para o Supabase (recebem a lista de produtos ATIVOS do catálogo).

/** Casa com a coleção: categoria OU tag (se a coleção definir as duas, basta uma) e dentro da faixa de preço. */
export function matchesCollection(product: Product, filters: CollectionFilters) {
  const byCategory = filters.categories?.includes(product.categorySlug) ?? false;
  const byTag = filters.tags?.some((tag) => product.tags.includes(tag)) ?? false;
  const hasGroup = Boolean(filters.categories?.length || filters.tags?.length);
  if (hasGroup && !byCategory && !byTag) return false;
  if (filters.minPriceCents !== undefined && product.priceCents < filters.minPriceCents) return false;
  if (filters.maxPriceCents !== undefined && product.priceCents > filters.maxPriceCents) return false;
  return true;
}

export const productsInCollection = (collection: Collection, products: Product[]) => products.filter((product) => matchesCollection(product, collection.filters));

/** Coleções com pelo menos 1 produto publicado, com a contagem (home, menu, sitemap). */
export function collectionsWithProducts(products: Product[], list: Collection[] = collections) {
  return list.map((collection) => ({ collection, count: productsInCollection(collection, products).length })).filter((item) => item.count > 0);
}

/**
 * Produto em destaque da landing: o primeiro destaque (featured) ou mais vendido manual da coleção; senão, o primeiro
 * da lista. Devolve o destaque e o resto (sem repetir).
 */
export function splitCollectionHighlight(products: Product[]) {
  const highlight = products.find((product) => product.featured) ?? products.find((product) => product.bestsellerManual) ?? products[0];
  return { highlight, rest: highlight ? products.filter((product) => product.id !== highlight.id) : products };
}
