import type { CatalogRepository } from "./repository";
import type { Product, ProductFilters } from "./types";
import { categories } from "./seed/categories";
import { drivers } from "./seed/drivers";
import { products } from "./seed/products";
import { teams } from "./seed/teams";

// Implementação do repositório lendo os arquivos de seed (em memória). Só produtos com status "active" aparecem.
export class SeedCatalogRepository implements CatalogRepository {
  private active = () => products.filter((product) => product.status === "active");

  async getProducts(filters: ProductFilters = {}) {
    let list = this.active().filter(
      (product) =>
        (!filters.category || product.categorySlug === filters.category) &&
        (!filters.team || product.teamSlug === filters.team) &&
        (!filters.driver || product.driverSlug === filters.driver) &&
        (filters.minPriceCents === undefined || product.priceCents >= filters.minPriceCents) &&
        (filters.maxPriceCents === undefined || product.priceCents <= filters.maxPriceCents) &&
        (!filters.isNew || product.isNew),
    );
    list = sortProducts(list, filters.sort);
    return filters.limit ? list.slice(0, filters.limit) : list;
  }

  async getProductBySlug(slug: string) {
    return this.active().find((product) => product.slug === slug) ?? null;
  }

  async getProductsBySlugs(slugs: string[]) {
    const all = this.active();
    return slugs.map((slug) => all.find((product) => product.slug === slug)).filter((p): p is Product => !!p);
  }

  // Relacionados: mesmo piloto, depois mesma equipe, depois mesma categoria (sem repetir o próprio produto).
  async getRelatedProducts(product: Product, limit = 4) {
    const others = this.active().filter((other) => other.id !== product.id);
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

  async getPriceRange() {
    const prices = this.active().map((product) => product.priceCents);
    return { minCents: Math.min(...prices), maxCents: Math.max(...prices) };
  }

  async getCategories() {
    return categories;
  }
  async getCategoryBySlug(slug: string) {
    return categories.find((category) => category.slug === slug) ?? null;
  }
  async getTeams() {
    return teams;
  }
  async getTeamBySlug(slug: string) {
    return teams.find((team) => team.slug === slug) ?? null;
  }
  async getDrivers() {
    return drivers;
  }
  async getDriverBySlug(slug: string) {
    return drivers.find((driver) => driver.slug === slug) ?? null;
  }
}

export function sortProducts(list: Product[], sort: ProductFilters["sort"] = "relevancia") {
  const copy = [...list];
  if (sort === "menor-preco") copy.sort((a, b) => a.priceCents - b.priceCents);
  else if (sort === "maior-preco") copy.sort((a, b) => b.priceCents - a.priceCents);
  else if (sort === "novidades") copy.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt.localeCompare(a.createdAt));
  return copy;
}
