import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { MemoryCatalogRepository, type CatalogData } from "./memory-repository";
import { categoryFromRow, driverFromRow, productFromRow, teamFromRow, type CategoryRow, type DriverRow, type ProductRow, type TeamRow } from "./supabase-mapping";

// Catálogo no Supabase (fase 9). Carrega as tabelas públicas (RLS: só produtos ativos) numa consulta por tabela e
// guarda em memória por CACHE_MS; filtros, ordenação e busca são os mesmos do seed (MemoryCatalogRepository).
// O catálogo é pequeno (centenas de itens): carregar tudo é mais simples e rápido que uma consulta por filtro.
// As páginas do catálogo são estáticas no build; o painel admin chama revalidatePath depois de salvar.
// Estoque: getVariantBySku consulta o banco na hora (o checkout nunca usa o cache), e a baixa real é feita pela
// função create_order (transação).
const CACHE_MS = 60_000;

let cached: { at: number; data: Promise<CatalogData> } | null = null;

async function loadFromSupabase(): Promise<CatalogData> {
  const db = createPublicClient();
  const [products, categories, teams, drivers] = await Promise.all([
    db.from("products").select("*, product_variants(*), product_images(*)").eq("status", "active").order("position"),
    db.from("categories").select("*").order("position"),
    db.from("teams").select("*").order("position"),
    db.from("drivers").select("*").order("position"),
  ]);
  const error = products.error ?? categories.error ?? teams.error ?? drivers.error;
  if (error) throw new Error(`Supabase (catálogo): ${error.message}`);
  return {
    products: (products.data as ProductRow[]).map(productFromRow),
    categories: (categories.data as CategoryRow[]).map(categoryFromRow),
    teams: (teams.data as TeamRow[]).map(teamFromRow),
    drivers: (drivers.data as DriverRow[]).map(driverFromRow),
  };
}

function loadCached() {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    const data = loadFromSupabase();
    cached = { at: Date.now(), data };
    data.catch(() => (cached = null)); // erro não fica no cache
  }
  return cached.data;
}

export class SupabaseCatalogRepository extends MemoryCatalogRepository {
  constructor() {
    super(loadCached);
  }

  async getVariantBySku(sku: string) {
    const db = createPublicClient();
    const { data, error } = await db.from("product_variants").select("*, products!inner(*, product_variants(*), product_images(*))").eq("sku", sku).maybeSingle();
    if (error) throw new Error(`Supabase (estoque): ${error.message}`);
    if (!data) return null;
    const product = productFromRow((data as unknown as { products: ProductRow }).products);
    const variant = product.variants.find((item) => item.sku === sku);
    return product.status === "active" && variant ? { product, variant } : null;
  }
}

/** Esquece o cache (o painel admin chama depois de salvar). */
export const clearCatalogCache = () => {
  cached = null;
};
