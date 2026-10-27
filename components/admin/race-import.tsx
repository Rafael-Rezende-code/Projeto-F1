"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { previewSeason, publishSeason, type SeasonPreview } from "@/app/admin/corridas/actions";
import { BRASILIA, formatRaceTime } from "@/lib/calendar";

// Importar o calendário da temporada (loja extra, item 5): busca na fonte aberta (Jolpica), mostra a PRÉVIA com os
// horários em Brasília e só grava as corridas marcadas, ao clicar em Publicar.
export function RaceImport({ defaultSeason }: { defaultSeason: number }) {
  const router = useRouter();
  const [season, setSeason] = useState(String(defaultSeason));
  const [preview, setPreview] = useState<SeasonPreview | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setMessage(null);
      const result = await previewSeason(Number(season));
      setPreview(result);
      setChosen(result.ok ? result.races.map((race) => race.sourceKey) : []);
      if (!result.ok) setMessage({ tone: "error", text: result.message });
    });
  const publish = () =>
    start(async () => {
      const result = await publishSeason(Number(season), chosen);
      setMessage(result.ok ? { tone: "ok", text: `${result.count} corrida(s) gravada(s). Confira tags e coleções em cada uma.` } : { tone: "error", text: result.message });
      if (result.ok) router.refresh();
    });
  const toggle = (key: string) => setChosen((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="temporada" className="mb-1.5 block text-xs font-medium text-black/70">Temporada</label>
          <input id="temporada" inputMode="numeric" value={season} onChange={(e) => setSeason(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-28 rounded-xl border border-black/15 px-3 py-2.5 text-sm" />
        </div>
        <button type="button" onClick={load} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01] disabled:opacity-60">
          {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Buscar prévia
        </button>
      </div>
      <p className="mt-2 text-xs text-black/60">Fonte: Jolpica (api.jolpi.ca), aberta e gratuita. Confira os horários: a fonte pode atualizar datas ao longo da temporada.</p>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-4 text-sm ${message.tone === "error" ? "text-[#b42318]" : "text-black/70"}`}>{message.text}</p>}
      {preview?.ok && (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-black/60">
                <tr><th className="p-3 font-medium">Publicar</th><th className="p-3 font-medium">Etapa</th><th className="p-3 font-medium">GP</th><th className="p-3 font-medium">Circuito · país</th><th className="p-3 font-medium">Sexta</th><th className="p-3 font-medium">Largada (Brasília)</th></tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {preview.races.map((race) => (
                  <tr key={race.sourceKey}>
                    <td className="p-3"><input type="checkbox" aria-label={`Publicar ${race.gpName}`} checked={chosen.includes(race.sourceKey)} onChange={() => toggle(race.sourceKey)} className="size-4 accent-[#b94f01]" /></td>
                    <td className="p-3 tabular-nums">{race.round}</td>
                    <td className="p-3 font-medium">{race.gpName}{race.exists && <span className="ml-2 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-black/60">já existe: atualiza</span>}</td>
                    <td className="p-3 text-black/70">{race.circuit} · {race.country}</td>
                    <td className="p-3 tabular-nums">{race.weekendStart.split("-").reverse().join("/")}</td>
                    <td className="p-3">{formatRaceTime(race.raceStart, BRASILIA)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.skipped > 0 && <p className="mt-2 text-xs text-black/60">{preview.skipped} corrida(s) sem data na fonte ficaram de fora.</p>}
          <button type="button" onClick={publish} disabled={pending || !chosen.length} className="mt-5 rounded-xl bg-[#b94f01] px-5 py-3 text-sm font-medium text-white hover:bg-[#9f4300] disabled:opacity-60">
            Publicar {chosen.length} corrida(s)
          </button>
        </>
      )}
    </div>
  );
}
