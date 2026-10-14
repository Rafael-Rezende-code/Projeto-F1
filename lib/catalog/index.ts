import type { CatalogRepository } from "./repository";
import { SeedCatalogRepository } from "./seed-repository";

// Ponto único de acesso ao catálogo nas páginas (server components / server actions).
// Para trocar a fonte de dados (ex.: Supabase), crie outra classe que implemente CatalogRepository e troque aqui.
export const catalog: CatalogRepository = new SeedCatalogRepository();

export type * from "./types";
