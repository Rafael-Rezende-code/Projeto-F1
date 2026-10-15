"use server";

import { catalog } from "@/lib/catalog";

// Busca da sobreposição (components/search-overlay.tsx). Usa a camada de repositório do catálogo no servidor e
// devolve só o que a lista de resultados precisa.
export type SearchHit = {
  products: { slug: string; name: string; priceCents: number; image: string; detail: string }[];
  teams: { slug: string; name: string; color: string }[];
  drivers: { slug: string; name: string; team: string }[];
  categories: { slug: string; name: string }[];
};

export async function searchCatalog(query: string): Promise<SearchHit> {
  const q = String(query ?? "").slice(0, 80);
  const [results, teams, categories] = await Promise.all([catalog.search(q, 8), catalog.getTeams(), catalog.getCategories()]);
  const teamName = (slug?: string) => teams.find((team) => team.slug === slug)?.name;
  const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name ?? "";
  return {
    products: results.products.map((product) => ({
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      image: product.images[0]?.src ?? "",
      detail: [teamName(product.teamSlug), categoryName(product.categorySlug)].filter(Boolean).join(" · "),
    })),
    teams: results.teams.map((team) => ({ slug: team.slug, name: team.name, color: team.color })),
    drivers: results.drivers.map((driver) => ({ slug: driver.slug, name: driver.name, team: teamName(driver.teamSlug) ?? "" })),
    categories: results.categories.map((category) => ({ slug: category.slug, name: category.name })),
  };
}

/** Sugestões do estado vazio: todas as equipes e pilotos. */
export async function searchSuggestions() {
  const [teams, drivers] = await Promise.all([catalog.getTeams(), catalog.getDrivers()]);
  return {
    teams: teams.map((team) => ({ slug: team.slug, name: team.name, color: team.color })),
    drivers: drivers.map((driver) => ({ slug: driver.slug, name: driver.name })),
  };
}
