import type { MetadataRoute } from "next";
import { catalog } from "@/lib/catalog";
import { collectionsWithProducts } from "@/lib/catalog/collections";
import { articles } from "@/lib/content/diario";
import { institutionalPages } from "@/lib/institutional";
import { ALLOW_INDEXING } from "@/lib/indexing";
import { SITE_URL } from "@/lib/site";

// Vazio até o lançamento (NEXT_PUBLIC_ALLOW_INDEXING="true"; lib/indexing.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!ALLOW_INDEXING) return [];
  const [products, teams, drivers, categories] = await Promise.all([catalog.getProducts(), catalog.getTeams(), catalog.getDrivers(), catalog.getCategories()]);
  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/produtos"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/equipes"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/pilotos"), changeFrequency: "weekly", priority: 0.8 },
    ...categories.map((c) => ({ url: url(`/categorias/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    // Coleções: só as que têm produto publicado (as vazias mostram "Em breve" e ficam fora do índice).
    { url: url("/colecoes"), changeFrequency: "weekly", priority: 0.8 },
    ...collectionsWithProducts(products).map(({ collection }) => ({ url: url(`/colecoes/${collection.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...teams.map((t) => ({ url: url(`/equipes/${t.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...drivers.map((d) => ({ url: url(`/pilotos/${d.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: url("/diario"), changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({ url: url(`/diario/${a.slug}`), lastModified: a.date, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: url(`/produtos/${p.slug}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...Object.keys(institutionalPages).map((slug) => ({ url: url(`/${slug}`), changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
