import type { CatalogRepository } from "./repository";
import type { Category, Driver, Product, ProductFilters, Team } from "./types";

/** Catálogo inteiro em memória: o que o repositório filtra, ordena e busca. */
export type CatalogData = { products: Product[]; categories: Category[]; teams: Team[]; drivers: Driver[] };

// Repositório em memória: recebe o catálogo de uma fonte (`load`) e faz filtros, ordenação e busca aqui. Usado pelo
// seed (lib/catalog/seed-repository.ts) e pelo Supabase (lib/catalog/supabase-repository.ts, que carrega as tabelas com
// cache curto). Só produtos com status "active" aparecem.
export class MemoryCatalogRepository implements CatalogRepository {
  constructor(protected load: () => Promise<CatalogData>) {}

  private async data() {
    const data = await this.load();
    return { ...data, active: data.products.filter((product) => product.status === "active") };
  }

  async getProducts(filters: ProductFilters = {}) {
    const data = await this.data();
    let list = data.active.filter(
      (product) =>
        (!filters.category || product.categorySlug === filters.category) &&
        (!filters.team || product.teamSlug === filters.team) &&
        (!filters.driver || product.driverSlug === filters.driver) &&
        (filters.minPriceCents === undefined || product.priceCents >= filters.minPriceCents) &&
        (filters.maxPriceCents === undefined || product.priceCents <= filters.maxPriceCents) &&
        (!filters.isNew || product.isNew) &&
        (!filters.query || matchesQuery(data, product, filters.query)),
    );
    list = sortProducts(list, filters.sort);
    return filters.limit ? list.slice(0, filters.limit) : list;
  }

  async getProductBySlug(slug: string) {
    return (await this.data()).active.find((product) => product.slug === slug) ?? null;
  }

  async getProductsBySlugs(slugs: string[]) {
    const all = (await this.data()).active;
    return slugs.map((slug) => all.find((product) => product.slug === slug)).filter((p): p is Product => !!p);
  }

  // Relacionados: mesmo piloto, depois mesma equipe, depois mesma categoria (sem repetir o próprio produto).
  async getRelatedProducts(product: Product, limit = 4) {
    const others = (await this.data()).active.filter((other) => other.id !== product.id);
    const score = (other: Product) =>
      (product.driverSlug && other.driverSlug === product.driverSlug ? 4 : 0) +
      (product.teamSlug && other.teamSlug === product.teamSlug ? 2 : 0) +
      (other.categorySlug === product.categorySlug ? 1 : 0);
    return others
      .map((other, index) => ({ other, index, score: score(other) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .map((item) => item.other);
  }

  async getVariantBySku(sku: string) {
    for (const product of (await this.data()).active) {
      const variant = product.variants.find((item) => item.sku === sku);
      if (variant) return { product, variant };
    }
    return null;
  }

  async search(query: string, limit = 8) {
    const { active, teams, drivers, categories } = await this.data();
    const terms = normalize(query).split(" ").filter(Boolean);
    if (!terms.length) return { products: [], teams: [], drivers: [], categories: [] };
    const matches = (text: string) => terms.every((term) => normalize(text).includes(term));
    const teamName = (slug?: string) => teams.find((team) => team.slug === slug)?.name ?? "";
    const driverName = (slug?: string) => drivers.find((driver) => driver.slug === slug)?.name ?? "";
    const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name ?? "";
    // Produto casa se TODOS os termos aparecem no nome, equipe, piloto, categoria ou tags; nome casado primeiro.
    const scored = active
      .map((product, index) => {
        const haystack = [product.name, teamName(product.teamSlug), driverName(product.driverSlug), categoryName(product.categorySlug), ...product.tags].join(" ");
        if (!matches(haystack)) return null;
        return { product, index, score: matches(product.name) ? 0 : 1 };
      })
      .filter((item): item is { product: Product; index: number; score: number } => item !== null)
      .sort((a, b) => a.score - b.score || a.index - b.index);
    return {
      products: scored.slice(0, limit).map((item) => item.product),
      teams: teams.filter((team) => matches(team.name)),
      drivers: drivers.filter((driver) => matches(driver.name) || matches(teamName(driver.teamSlug))),
      categories: categories.filter((category) => matches(category.name)),
    };
  }

  async getPriceRange() {
    const prices = (await this.data()).active.map((product) => product.priceCents);
    return { minCents: Math.min(...prices), maxCents: Math.max(...prices) };
  }

  async getCategories() {
    return (await this.load()).categories;
  }
  async getCategoryBySlug(slug: string) {
    return (await this.load()).categories.find((category) => category.slug === slug) ?? null;
  }
  async getTeams() {
    return (await this.load()).teams;
  }
  async getTeamBySlug(slug: string) {
    return (await this.load()).teams.find((team) => team.slug === slug) ?? null;
  }
  async getDrivers() {
    return (await this.load()).drivers;
  }
  async getDriverBySlug(slug: string) {
    return (await this.load()).drivers.find((driver) => driver.slug === slug) ?? null;
  }
}

// Mesma regra da busca: todos os termos aparecem no nome, equipe, piloto, categoria ou tags (sem acento/maiúsculas).
function matchesQuery({ teams, drivers, categories }: CatalogData, product: Product, query: string) {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalize([product.name, teams.find((t) => t.slug === product.teamSlug)?.name ?? "", drivers.find((d) => d.slug === product.driverSlug)?.name ?? "", categories.find((c) => c.slug === product.categorySlug)?.name ?? "", ...product.tags].join(" "));
  return terms.every((term) => haystack.includes(term));
}

/** Minúsculas, sem acentos e sem pontuação, para comparar buscas. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sortProducts(list: Product[], sort: ProductFilters["sort"] = "relevancia") {
  const copy = [...list];
  if (sort === "menor-preco") copy.sort((a, b) => a.priceCents - b.priceCents);
  else if (sort === "maior-preco") copy.sort((a, b) => b.priceCents - a.priceCents);
  else if (sort === "novidades") copy.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt.localeCompare(a.createdAt));
  return copy;
}
