import { MemoryCatalogRepository, type CatalogData } from "./memory-repository";
import { attachDrops } from "@/lib/drops";
import { categories } from "./seed/categories";
import { drivers, withCodeOnlyDrivers } from "./seed/drivers";
import { products } from "./seed/products";
import { teams } from "./seed/teams";

export { normalize, sortProducts } from "./memory-repository";

/** O catálogo de demonstração (arquivos em lib/catalog/seed/). Também é a fonte do script de seed do Supabase. */
export const seedData: CatalogData = { products, categories, teams, drivers };

// Implementação padrão (sem Supabase configurado): o seed em memória.
export class SeedCatalogRepository extends MemoryCatalogRepository {
  constructor() {
    // Em desenvolvimento, os drops de exemplo (lib/drops-example.ts); fora dele, o seed puro.
    // O campeão (piloto só no código) entra no início da lista.
    const data: CatalogData = { ...seedData, drivers: withCodeOnlyDrivers(seedData.drivers) };
    super(async () => (process.env.NODE_ENV === "development" ? { ...data, products: attachDrops(data.products, (await import("@/lib/drops-example")).exampleDrops()) } : data));
  }
}
