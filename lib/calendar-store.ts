import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { raceFromRow, type RaceWeekend } from "@/lib/calendar";

// Calendário de corridas (loja extra, item 5): tabela race_weekends (só as ativas; cache curto). Sem banco: nada em
// produção (a loja não inventa calendário); em desenvolvimento, o exemplo de lib/calendar-example.ts.
let cache: { at: number; races: RaceWeekend[] } | null = null;
const TTL = 60_000;

export async function getRaceWeekends(): Promise<RaceWeekend[]> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") return (await import("@/lib/calendar-example")).exampleRaces();
    return [];
  }
  if (cache && Date.now() - cache.at < TTL) return cache.races;
  const { data, error } = await createPublicClient()
    .from("race_weekends")
    .select("id, gp_name, circuit, country, weekend_start, race_start, collection_slug, tags, active")
    .eq("active", true)
    .gte("race_start", new Date(Date.now() - 24 * 3_600_000).toISOString())
    .order("race_start")
    .limit(10);
  if (error) {
    console.error("[corridas] leitura:", error.code);
    return cache?.races ?? [];
  }
  cache = { at: Date.now(), races: (data ?? []).map(raceFromRow) };
  return cache.races;
}

export function clearRaceCache() {
  cache = null;
}
