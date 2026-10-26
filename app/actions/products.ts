"use server";

import { catalog } from "@/lib/catalog";

// Produtos para cards montados no navegador (ex.: "Vistos recentemente"), na ordem dos slugs. Slugs que não existem
// mais (ou não estão publicados) são ignorados. Limite de 12 por chamada.
export async function getCardProducts(slugs: string[]) {
  const clean = (Array.isArray(slugs) ? slugs : []).filter((slug) => typeof slug === "string" && /^[a-z0-9-]{1,120}$/.test(slug)).slice(0, 12);
  if (!clean.length) return [];
  const [products, categories] = await Promise.all([catalog.getProductsBySlugs(clean), catalog.getCategories()]);
  return products.map((product) => ({ product, categoryName: categories.find((category) => category.slug === product.categorySlug)?.name }));
}
