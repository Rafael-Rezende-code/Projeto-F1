import Link from "next/link";
import { notFound } from "next/navigation";
import { RaceFormView } from "@/components/admin/race-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { BRASILIA, utcToZoned } from "@/lib/calendar";
import { collections } from "@/lib/content/collections";

export default async function EditarCorrida({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabase.from("race_weekends").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as { id: string; gp_name: string; circuit: string; country: string; weekend_start: string; race_start: string; collection_slug: string | null; tags: string[]; active: boolean; source_key: string | null };
  return (
    <div>
      <Link href="/admin/corridas" className="text-sm text-black/60 hover:underline">← Corridas</Link>
      <h1 className="mb-2 mt-3 text-4xl tracking-[-0.05em]">{row.gp_name}</h1>
      {row.source_key && <p className="mb-6 text-xs text-black/60">Importada ({row.source_key}). Reimportar a temporada atualiza nome, local e horários; tags e coleção ficam.</p>}
      <RaceFormView
        collections={collections.map((item) => ({ slug: item.slug, title: item.title }))}
        initial={{
          id: row.id,
          gpName: row.gp_name,
          circuit: row.circuit,
          country: row.country,
          weekendStart: row.weekend_start.slice(0, 10),
          raceLocal: utcToZoned(row.race_start, BRASILIA),
          timeZone: BRASILIA,
          collectionSlug: row.collection_slug ?? "",
          tags: row.tags.join(", "),
          active: row.active,
        }}
      />
    </div>
  );
}
