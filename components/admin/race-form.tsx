"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteRace, saveRace, setRaceActive } from "@/app/admin/corridas/actions";
import type { RaceForm } from "@/lib/admin/race-schema";
import { RACE_TIME_ZONES } from "@/lib/calendar";

const EMPTY: RaceForm = { gpName: "", circuit: "", country: "", weekendStart: "", raceLocal: "", timeZone: "America/Sao_Paulo", collectionSlug: "", tags: "", active: true };
const input = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";
const label = "mb-1.5 block text-xs font-medium text-black/70";

// Formulário de corrida (loja extra, item 5). Validação no servidor (lib/admin/race-schema.ts).
export function RaceFormView({ initial, collections }: { initial?: RaceForm & { id?: string }; collections: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState<RaceForm>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof RaceForm>(key: K, value: RaceForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-[#b42318]">{errors[key]}</p>;

  const submit = () =>
    start(async () => {
      setMessage(null);
      const result = await saveRace(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setErrors({});
      setMessage({ tone: "ok", text: "Corrida salva." });
      if (!form.id) router.replace(`/admin/corridas/${result.id}`);
      else router.refresh();
    });
  const toggle = () =>
    start(async () => {
      if (!form.id) return;
      const result = await setRaceActive(form.id, !form.active);
      if (result.ok) set("active", !form.active);
      setMessage(result.ok ? { tone: "ok", text: form.active ? "Corrida escondida da loja." : "Corrida visível na loja." } : { tone: "error", text: result.message });
    });
  const remove = () =>
    start(async () => {
      if (!form.id || !window.confirm("Apagar esta corrida do calendário?")) return;
      const result = await deleteRace(form.id);
      if (result.ok) router.replace("/admin/corridas");
      else setMessage({ tone: "error", text: result.message });
    });

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="gp">Nome do GP</label>
          <input id="gp" className={input} value={form.gpName} onChange={(e) => set("gpName", e.target.value)} placeholder="GP de São Paulo" />
          {error("gpName")}
        </div>
        <div>
          <label className={label} htmlFor="circuito">Circuito</label>
          <input id="circuito" className={input} value={form.circuit} onChange={(e) => set("circuit", e.target.value)} />
          {error("circuit")}
        </div>
        <div>
          <label className={label} htmlFor="pais">País</label>
          <input id="pais" className={input} value={form.country} onChange={(e) => set("country", e.target.value)} />
          {error("country")}
        </div>
        <div>
          <label className={label} htmlFor="sexta">Sexta do fim de semana (Brasília)</label>
          <input id="sexta" type="date" className={input} value={form.weekendStart} onChange={(e) => set("weekendStart", e.target.value)} />
          {error("weekendStart")}
        </div>
        <div>
          <label className={label} htmlFor="largada">Largada</label>
          <input id="largada" type="datetime-local" className={input} value={form.raceLocal} onChange={(e) => set("raceLocal", e.target.value)} />
          {error("raceLocal")}
        </div>
        <div>
          <label className={label} htmlFor="fuso">Fuso da largada digitada</label>
          <select id="fuso" className={input} value={form.timeZone} onChange={(e) => set("timeZone", e.target.value)}>
            {RACE_TIME_ZONES.map(([zone, name]) => <option key={zone} value={zone}>{name}</option>)}
          </select>
          {error("timeZone")}
        </div>
        <div>
          <label className={label} htmlFor="colecao">Coleção em destaque (opcional)</label>
          <select id="colecao" className={input} value={form.collectionSlug} onChange={(e) => set("collectionSlug", e.target.value)}>
            <option value="">— usar as tags —</option>
            {collections.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="tags">Tags do catálogo para &quot;Ver a coleção do fim de semana&quot; (separadas por vírgula)</label>
          <input id="tags" className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="interlagos, brasil" />
          {error("tags")}
        </div>
        {!form.id && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#b94f01]" /> Visível na loja
          </label>
        )}
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-5 text-sm ${message.tone === "error" ? "text-[#b42318]" : "text-black/70"}`}>{message.text}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01] disabled:opacity-60">
          {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Salvar
        </button>
        {form.id && (
          <>
            <button type="button" onClick={toggle} disabled={pending} className="rounded-xl border border-black/15 px-5 py-3 text-sm hover:border-black">{form.active ? "Esconder da loja" : "Mostrar na loja"}</button>
            <button type="button" onClick={remove} disabled={pending} className="rounded-xl px-5 py-3 text-sm text-[#b42318] hover:bg-[#b42318]/5">Apagar</button>
          </>
        )}
      </div>
    </div>
  );
}
