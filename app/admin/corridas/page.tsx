import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { BRASILIA, formatRaceTime } from "@/lib/calendar";

type Row = { id: string; gp_name: string; circuit: string; country: string; weekend_start: string; race_start: string; tags: string[]; collection_slug: string | null; active: boolean };
const currentTime = () => Date.now();

// Calendário (loja extra, item 5): corridas futuras primeiro; as passadas ficam embaixo.
export default async function AdminCorridas() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("race_weekends").select("id, gp_name, circuit, country, weekend_start, race_start, tags, collection_slug, active").order("race_start");
  const rows = (data ?? []) as Row[];
  const now = currentTime();
  const upcoming = rows.filter((row) => new Date(row.race_start).getTime() >= now - 2 * 3_600_000);
  const past = rows.filter((row) => !upcoming.includes(row)).reverse();
  const table = (list: Row[], empty: string) => (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs text-black/60">
          <tr><th className="p-4 font-medium">GP</th><th className="p-4 font-medium">Sexta</th><th className="p-4 font-medium">Largada (Brasília)</th><th className="p-4 font-medium">Coleção / tags</th><th className="p-4 font-medium">Situação</th></tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {list.map((row) => (
            <tr key={row.id}>
              <td className="p-4"><Link href={`/admin/corridas/${row.id}`} className="font-medium underline underline-offset-4">{row.gp_name}</Link><span className="block text-xs text-black/60">{[row.circuit, row.country].filter(Boolean).join(" · ")}</span></td>
              <td className="p-4 tabular-nums">{row.weekend_start.slice(0, 10).split("-").reverse().join("/")}</td>
              <td className="p-4">{formatRaceTime(row.race_start, BRASILIA)}</td>
              <td className="p-4 text-xs text-black/70">{row.collection_slug ? `coleção ${row.collection_slug}` : row.tags.length ? row.tags.join(", ") : "—"}</td>
              <td className="p-4">{row.active ? "Visível" : "Escondida"}</td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-black/60">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Corridas</h1>
        <div className="flex gap-2">
          <Link href="/admin/corridas/importar" className="rounded-xl border border-black/15 px-5 py-3 text-sm font-medium hover:border-black">Importar temporada</Link>
          <Link href="/admin/corridas/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Nova corrida</Link>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-black/60">A próxima corrida visível aparece na home, nos pilotos e nas equipes (com contagem regressiva). Sem corridas futuras, o bloco não aparece. De sexta a segunda, a home destaca a semana de corrida.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Não foi possível carregar: {error.message}</p>}
      <h2 className="mt-8 font-medium">Próximas</h2>
      {table(upcoming, "Nenhuma corrida futura cadastrada.")}
      {past.length > 0 && (
        <>
          <h2 className="mt-8 font-medium">Já realizadas</h2>
          {table(past, "")}
        </>
      )}
    </div>
  );
}
