"use server";

import { catalog } from "@/lib/catalog";

// Produtos dos favoritos (slugs guardados no navegador). Slugs que não existem mais são ignorados.
export async function getFavoriteProducts(slugs: string[]) {
  const clean = (Array.isArray(slugs) ? slugs : []).filter((slug) => typeof slug === "string").slice(0, 100);
  const [products, categories] = await Promise.all([catalog.getProductsBySlugs(clean), catalog.getCategories()]);
  return products.map((product) => ({ product, categoryName: categories.find((c) => c.slug === product.categorySlug)?.name }));
}
