import type { Category, Driver, Product, ProductFilters, ProductVariant, Team } from "./types";

// Interface da camada de dados do catálogo. As páginas só conversam com ela (via lib/catalog/index.ts).
// Implementação atual: SeedCatalogRepository (arquivos em lib/catalog/seed/). Para trocar por Supabase, ver CLAUDE.md.
// Todos os métodos são assíncronos de propósito: a implementação com banco também será.
export interface CatalogRepository {
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductsBySlugs(slugs: string[]): Promise<Product[]>;
  getRelatedProducts(product: Product, limit?: number): Promise<Product[]>;
  /** Produto e variante de um SKU (usado pelo checkout para conferir preço e estoque no servidor). */
  getVariantBySku(sku: string): Promise<{ product: Product; variant: ProductVariant } | null>;
  getPriceRange(): Promise<{ minCents: number; maxCents: number }>;

  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;

  getTeams(): Promise<Team[]>;
  getTeamBySlug(slug: string): Promise<Team | null>;

  getDrivers(): Promise<Driver[]>;
  getDriverBySlug(slug: string): Promise<Driver | null>;
}
