"use server";

import { catalog } from "@/lib/catalog";
import { onlyPage, PAGE_SIZE, parseCatalogParams, toProductFilters, type CatalogSearchParams } from "@/lib/catalog/filters";

// "Carregar mais" do catálogo (refino 3, item 3.3): devolve SÓ a página pedida, com os mesmos filtros da URL (lidos de
// novo aqui: nada vem pronto do navegador), e se ainda há mais.
export async function loadCatalogPage(params: CatalogSearchParams, page: number) {
  const parsed = parseCatalogParams(params && typeof params === "object" ? params : {});
  const target = Number.isInteger(page) && page >= 2 && page <= 100 ? page : 2;
  const [all, categories] = await Promise.all([catalog.getProducts(toProductFilters(parsed)), catalog.getCategories()]);
  const items = onlyPage(all, target).map((product) => ({ product, categoryName: categories.find((category) => category.slug === product.categorySlug)?.name }));
  return { items, page: target, hasMore: all.length > target * PAGE_SIZE };
}
