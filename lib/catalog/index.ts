import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CatalogRepository } from "./repository";
import { SeedCatalogRepository } from "./seed-repository";
import { SupabaseCatalogRepository } from "./supabase-repository";

// Ponto único de acesso ao catálogo nas páginas (server components / server actions).
// Com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY definidas, lê do Supabase (lib/catalog/supabase-repository.ts);
// sem elas, usa o seed local (lib/catalog/seed/), exatamente como antes. Ver docs/backend/supabase.md.
export const catalog: CatalogRepository = isSupabaseConfigured() ? new SupabaseCatalogRepository() : new SeedCatalogRepository();

export type * from "./types";
