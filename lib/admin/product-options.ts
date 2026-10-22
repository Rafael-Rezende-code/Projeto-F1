import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Opções dos selects do formulário de produto (categorias, equipes, pilotos). */
export async function productOptions(supabase: SupabaseClient) {
  const [categories, teams, drivers] = await Promise.all([
    supabase.from("categories").select("slug, name").order("position"),
    supabase.from("teams").select("slug, name").order("position"),
    supabase.from("drivers").select("slug, name, team_slug").order("position"),
  ]);
  return {
    categories: (categories.data ?? []) as { slug: string; name: string }[],
    teams: (teams.data ?? []) as { slug: string; name: string }[],
    drivers: (drivers.data ?? []) as { slug: string; name: string; team_slug: string }[],
  };
}
export type ProductOptions = Awaited<ReturnType<typeof productOptions>>;
