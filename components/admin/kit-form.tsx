"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteKit, saveKit, setKitActive } from "@/app/admin/kits/actions";
import type { KitForm } from "@/lib/admin/kit-schema";

type Option = { slug: string; name: string };
const EMPTY: KitForm = { slug: "", title: "", teamSlug: "", driverSlug: "", products: ["", "", ""], percent: "10", active: true };
const input = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";
const label = "mb-1.5 block text-xs font-medium text-black/70";

// Formulário de kit (loja extra, item 2). Validação no servidor (lib/admin/kit-schema.ts).
export function KitFormView({ initial, teams, drivers, products }: { initial?: KitForm & { id?: string }; teams: Option[]; drivers: Option[]; products: Option[] }) {
  const router = useRouter();
  const [form, setForm] = useState<KitForm>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof KitForm>(key: K, value: KitForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-[#b42318]">{errors[key]}</p>;
  const setProduct = (index: number, value: string) => set("products", form.products.map((item, i) => (i === index ? value : item)));

  const submit = () =>
    start(async () => {
      setMessage(null);
      const result = await saveKit(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setErrors({});
      setMessage({ tone: "ok", text: "Kit salvo." });
      if (!form.id) router.replace(`/admin/kits/${result.id}`);
      else router.refresh();
    });

  const toggle = () =>
    start(async () => {
      if (!form.id) return;
      const result = await setKitActive(form.id, !form.active);
      if (result.ok) set("active", !form.active);
      setMessage(result.ok ? { tone: "ok", text: form.active ? "Kit desativado." : "Kit ativado." } : { tone: "error", text: result.message });
    });

  const remove = () =>
    start(async () => {
      if (!form.id || !window.confirm("Apagar este kit? Pedidos já feitos guardam o desconto que tiveram.")) return;
      const result = await deleteKit(form.id);
      if (result.ok) router.replace("/admin/kits");
      else setMessage({ tone: "error", text: result.message });
    });

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="kit-titulo">Nome</label>
          <input id="kit-titulo" className={input} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Kit dia de corrida Hamilton" />
          {error("title")}
        </div>
        <div>
          <label className={label} htmlFor="kit-slug">Endereço (slug)</label>
          <input id="kit-slug" className={`${input} font-mono`} value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="kit-hamilton" />
          {error("slug")}
        </div>
        <div>
          <label className={label} htmlFor="kit-equipe">Equipe (página onde aparece)</label>
          <select id="kit-equipe" className={input} value={form.teamSlug} onChange={(e) => set("teamSlug", e.target.value)}>
            <option value="">—</option>
            {teams.map((team) => <option key={team.slug} value={team.slug}>{team.name}</option>)}
          </select>
          {error("teamSlug")}
        </div>
        <div>
          <label className={label} htmlFor="kit-piloto">Piloto (página onde aparece)</label>
          <select id="kit-piloto" className={input} value={form.driverSlug} onChange={(e) => set("driverSlug", e.target.value)}>
            <option value="">—</option>
            {drivers.map((driver) => <option key={driver.slug} value={driver.slug}>{driver.name}</option>)}
          </select>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className={label}>Peças (2 a 6; qualquer tamanho conta; itens personalizados nunca entram no kit)</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {form.products.map((value, index) => (
              <div key={index} className="flex gap-2">
                <label className="sr-only" htmlFor={`kit-peca-${index}`}>Peça {index + 1}</label>
                <select id={`kit-peca-${index}`} className={input} value={value} onChange={(e) => setProduct(index, e.target.value)}>
                  <option value="">Escolha a peça {index + 1}</option>
                  {products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}
                </select>
                {form.products.length > 2 && (
                  <button type="button" onClick={() => set("products", form.products.filter((_, i) => i !== index))} className="rounded-xl px-2 text-xs text-black/60 hover:bg-black/5" aria-label={`Tirar a peça ${index + 1}`}>×</button>
                )}
              </div>
            ))}
          </div>
          {form.products.length < 6 && <button type="button" onClick={() => set("products", [...form.products, ""])} className="mt-2 text-xs underline underline-offset-4">+ peça</button>}
          {error("products")}
        </fieldset>
        <div>
          <label className={label} htmlFor="kit-desconto">Desconto do kit (%)</label>
          <input id="kit-desconto" inputMode="numeric" className={input} value={form.percent} onChange={(e) => set("percent", e.target.value)} />
          {error("percent")}
          <p className="mt-1 text-xs text-black/60">Sobre a soma das peças, sem frete. Não se soma a cupons (salvo NEXT_PUBLIC_COUPON_WITH_KIT).</p>
        </div>
        {!form.id && (
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#b94f01]" /> Ativo
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
            <button type="button" onClick={toggle} disabled={pending} className="rounded-xl border border-black/15 px-5 py-3 text-sm hover:border-black">{form.active ? "Desativar" : "Ativar"}</button>
            <button type="button" onClick={remove} disabled={pending} className="rounded-xl px-5 py-3 text-sm text-[#b42318] hover:bg-[#b42318]/5">Apagar</button>
          </>
        )}
      </div>
    </div>
  );
}
