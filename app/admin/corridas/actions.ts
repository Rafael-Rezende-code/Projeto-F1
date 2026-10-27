"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { raceFormSchema, raceRow, type RaceForm } from "@/lib/admin/race-schema";
import { fieldErrors } from "@/lib/checkout/schema";
import { clearRaceCache } from "@/lib/calendar-store";
import { JOLPICA_URL, parseJolpicaSeason, type ImportedRace } from "@/lib/calendar-import";

export type RaceSaveResult = { ok: true; id: string } | { ok: false; message: string; errors?: Record<string, string> };

const refresh = (id?: string) => {
  clearRaceCache();
  revalidatePath("/admin/corridas");
  if (id) revalidatePath(`/admin/corridas/${id}`);
  revalidatePath("/");
  revalidatePath("/pilotos/[slug]", "page");
  revalidatePath("/equipes/[slug]", "page");
};

// Corridas no painel (loja extra, item 5). Sessão do administrador; o RLS do banco confere de novo (is_admin).
export async function saveRace(input: RaceForm): Promise<RaceSaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = raceFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos destacados.", errors: fieldErrors(parsed.error) };
  const row = raceRow(parsed.data);
  const query = parsed.data.id
    ? supabase.from("race_weekends").update(row).eq("id", parsed.data.id).select("id").single()
    : supabase.from("race_weekends").insert(row).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, message: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };
  refresh(data.id as string);
  return { ok: true, id: data.id as string };
}

export async function setRaceActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("race_weekends").update({ active }).eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível salvar: ${error.message}` };
  refresh(id);
  return { ok: true as const };
}

export async function deleteRace(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("race_weekends").delete().eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível apagar: ${error.message}` };
  refresh();
  return { ok: true as const };
}

async function fetchSeason(season: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(JOLPICA_URL(season), { signal: controller.signal, cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return { ok: false as const, message: `A fonte respondeu ${response.status}. Tente mais tarde.` };
    return { ok: true as const, ...parseJolpicaSeason(await response.json()) };
  } catch {
    return { ok: false as const, message: "Não foi possível consultar a fonte do calendário agora." };
  } finally {
    clearTimeout(timer);
  }
}

export type SeasonPreview = { ok: true; season: number; races: (ImportedRace & { exists: boolean })[]; skipped: number } | { ok: false; message: string };

/** Prévia da temporada (nada é gravado): para conferir nomes e horários antes de publicar. */
export async function previewSeason(season: number): Promise<SeasonPreview> {
  const { supabase } = await requireAdmin();
  if (!Number.isInteger(season) || season < 2020 || season > 2100) return { ok: false, message: "Temporada inválida." };
  const result = await fetchSeason(season);
  if (!result.ok) return result;
  if (!result.races.length) return { ok: false, message: "A fonte ainda não tem corridas para esta temporada." };
  const { data } = await supabase.from("race_weekends").select("source_key").in("source_key", result.races.map((race) => race.sourceKey));
  const existing = new Set((data ?? []).map((row: { source_key: string }) => row.source_key));
  return { ok: true, season, skipped: result.skipped, races: result.races.map((race) => ({ ...race, exists: existing.has(race.sourceKey) })) };
}

/** Grava a temporada conferida (busca de novo na fonte; reimportar atualiza nome, local e horários pela origem). */
export async function publishSeason(season: number, keys: string[]) {
  const { supabase } = await requireAdmin();
  const result = await fetchSeason(season);
  if (!result.ok) return result;
  const chosen = result.races.filter((race) => keys.includes(race.sourceKey));
  if (!chosen.length) return { ok: false as const, message: "Nenhuma corrida escolhida." };
  const rows = chosen.map((race) => ({ source_key: race.sourceKey, gp_name: race.gpName, circuit: race.circuit, country: race.country, weekend_start: race.weekendStart, race_start: race.raceStart }));
  const { error } = await supabase.from("race_weekends").upsert(rows, { onConflict: "source_key" });
  if (error) return { ok: false as const, message: `Não foi possível gravar: ${error.message}` };
  refresh();
  return { ok: true as const, count: rows.length };
}
