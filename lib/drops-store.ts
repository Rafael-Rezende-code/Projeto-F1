import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { dropFromRow, type Drop } from "@/lib/drops";

// Drops ativos (loja extra, item 6): tabela drops (cache curto). Sem banco: nenhum em produção; em desenvolvimento, o
// exemplo de lib/drops-example.ts.
let cache: { at: number; drops: Drop[] } | null = null;
const TTL = 60_000;
export const DROP_COLUMNS = "id, slug, title, description, cover, launch_at, mode, ship_estimate, per_order_limit, product_slugs, active";

export async function getDrops(): Promise<Drop[]> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") return (await import("@/lib/drops-example")).exampleDrops();
    return [];
  }
  if (cache && Date.now() - cache.at < TTL) return cache.drops;
  const { data, error } = await createPublicClient().from("drops").select(DROP_COLUMNS).eq("active", true).order("launch_at");
  if (error) {
    console.error("[drops] leitura:", error.code);
    return cache?.drops ?? [];
  }
  cache = { at: Date.now(), drops: (data ?? []).map(dropFromRow) };
  return cache.drops;
}

export function clearDropsCache() {
  cache = null;
}
