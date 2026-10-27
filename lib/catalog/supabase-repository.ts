import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { MemoryCatalogRepository, type CatalogData } from "./memory-repository";
import { attachDrops, dropFromRow } from "@/lib/drops";
import { DROP_COLUMNS } from "@/lib/drops-store";
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
  const [products, categories, teams, drivers, drops] = await Promise.all([
    db.from("products").select("*, product_variants(*), product_images(*)").eq("status", "active").order("position"),
    db.from("categories").select("*").order("position"),
    db.from("teams").select("*").order("position"),
    db.from("drivers").select("*").order("position"),
    // Drops (loja extra, item 6): banco sem a tabela → sem drops.
    db.from("drops").select(DROP_COLUMNS).eq("active", true),
  ]);
  const error = products.error ?? categories.error ?? teams.error ?? drivers.error;
  if (error) throw new Error(`Supabase (catálogo): ${error.message}`);
  return {
    products: attachDrops((products.data as ProductRow[]).map(productFromRow), drops.error ? [] : (drops.data ?? []).map(dropFromRow)),
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

// Mais vendidos de verdade (pedidos pagos dos últimos 90 dias, sem testes): só os slugs, em ordem (função
// bestseller_slugs, migração 20261030000000_curadoria.sql). Banco sem a função: lista vazia (a seção usa a curadoria).
let sales: { at: number; data: Promise<string[]> } | null = null;
async function loadSalesFromSupabase() {
  const { data, error } = await createPublicClient().rpc("bestseller_slugs", { p_days: 90, p_limit: 8 });
  if (error) return [];
  return ((data ?? []) as { slug: string; place: number }[]).sort((a, b) => a.place - b.place).map((row) => row.slug);
}
function loadSalesCached() {
  if (!sales || Date.now() - sales.at > CACHE_MS) sales = { at: Date.now(), data: loadSalesFromSupabase() };
  return sales.data;
}

export class SupabaseCatalogRepository extends MemoryCatalogRepository {
  constructor() {
    super(loadCached, loadSalesCached);
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
  sales = null;
};
