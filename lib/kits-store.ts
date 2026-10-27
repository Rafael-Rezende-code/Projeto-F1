import "server-only";
import { createShowcaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { kitFromRow, LOCAL_KITS, type Kit } from "@/lib/kits";

// Kits ativos (loja extra, item 2): do banco quando o Supabase está ligado (cache curto, como o catálogo), senão os
// locais. Só leitura pública (RLS: o visitante vê só kits ativos).
let cache: { at: number; kits: Kit[] } | null = null;
const TTL = 60_000;

export async function getKits(): Promise<Kit[]> {
  if (!isSupabaseConfigured()) return LOCAL_KITS;
  if (cache && Date.now() - cache.at < TTL) return cache.kits;
  const { data, error } = await createShowcaseClient().from("kits").select("slug, title, team_slug, driver_slug, product_slugs, discount_percent, active").eq("active", true).order("slug");
  if (error) {
    console.error("[kits] leitura:", error.code);
    return cache?.kits ?? [];
  }
  cache = { at: Date.now(), kits: (data ?? []).map(kitFromRow) };
  return cache.kits;
}

export function clearKitsCache() {
  cache = null;
}
