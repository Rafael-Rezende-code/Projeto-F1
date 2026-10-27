"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { deleteDrop, notifyDropWaitlist, saveDrop, setDropActive } from "@/app/admin/drops/actions";
import type { DropForm } from "@/lib/admin/drop-schema";

const EMPTY: DropForm = { slug: "", title: "", description: "", cover: "", launchLocal: "", mode: "lancamento", shipEstimate: "", perOrderLimit: "", products: [], active: true };
const input = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";
const label = "mb-1.5 block text-xs font-medium text-black/70";

// Formulário de drop (loja extra, item 6). Validação no servidor (lib/admin/drop-schema.ts).
export function DropFormView({ initial, products }: { initial?: DropForm & { id?: string }; products: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState<DropForm>(initial ?? EMPTY);
  const [filter, setFilter] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof DropForm>(key: K, value: DropForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-[#b42318]">{errors[key]}</p>;
  const toggleProduct = (slug: string) => set("products", form.products.includes(slug) ? form.products.filter((item) => item !== slug) : [...form.products, slug]);
  const visible = products.filter((product) => !filter || product.name.toLowerCase().includes(filter.toLowerCase()) || form.products.includes(product.slug));

  const submit = () =>
    start(async () => {
      setMessage(null);
      const result = await saveDrop(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setErrors({});
      setMessage({ tone: "ok", text: "Drop salvo." });
      if (!form.id) router.replace(`/admin/drops/${result.id}`);
      else router.refresh();
    });
  const toggle = () =>
    start(async () => {
      if (!form.id) return;
      const result = await setDropActive(form.id, !form.active);
      if (result.ok) set("active", !form.active);
      setMessage(result.ok ? { tone: "ok", text: form.active ? "Drop escondido da loja." : "Drop visível na loja." } : { tone: "error", text: result.message });
    });
  const remove = () =>
    start(async () => {
      if (!form.id || !window.confirm("Apagar este drop e a lista de espera dele?")) return;
      const result = await deleteDrop(form.id);
      if (result.ok) router.replace("/admin/drops");
      else setMessage({ tone: "error", text: result.message });
    });

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="drop-titulo">Nome</label>
          <input id="drop-titulo" className={input} value={form.title} onChange={(e) => set("title", e.target.value)} />
          {error("title")}
        </div>
        <div>
          <label className={label} htmlFor="drop-slug">Endereço (slug)</label>
          <input id="drop-slug" className={`${input} font-mono`} value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
          {error("slug")}
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="drop-descricao">Descrição</label>
          <textarea id="drop-descricao" rows={3} className={input} value={form.description} onChange={(e) => set("description", e.target.value)} />
          {error("description")}
        </div>
        <div>
          <label className={label} htmlFor="drop-lancamento">Lançamento (horário de Brasília)</label>
          <input id="drop-lancamento" type="datetime-local" className={input} value={form.launchLocal} onChange={(e) => set("launchLocal", e.target.value)} />
          {error("launchLocal")}
        </div>
        <div>
          <label className={label} htmlFor="drop-modo">Modo</label>
          <select id="drop-modo" className={input} value={form.mode} onChange={(e) => set("mode", e.target.value as DropForm["mode"])}>
            <option value="lancamento">Lançamento (vende a partir da data)</option>
            <option value="pre_venda">Pré-venda (vende a partir da data, com envio previsto)</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="drop-envio">Previsão de envio (pré-venda)</label>
          <input id="drop-envio" className={input} value={form.shipEstimate} onChange={(e) => set("shipEstimate", e.target.value)} placeholder="a partir de 15/12" />
          {error("shipEstimate")}
        </div>
        <div>
          <label className={label} htmlFor="drop-limite">Limite de peças por pedido (vazio = sem limite)</label>
          <input id="drop-limite" inputMode="numeric" className={input} value={form.perOrderLimit} onChange={(e) => set("perOrderLimit", e.target.value.replace(/\D/g, "").slice(0, 2))} />
          {error("perOrderLimit")}
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="drop-capa">Capa (opcional: link https:// ou /images/...)</label>
          <input id="drop-capa" className={input} value={form.cover} onChange={(e) => set("cover", e.target.value)} />
          {error("cover")}
        </div>
        <fieldset className="sm:col-span-2">
          <legend className={label}>Peças do drop ({form.products.length})</legend>
          <label className="sr-only" htmlFor="drop-filtro">Filtrar peças</label>
          <input id="drop-filtro" className={`${input} mb-2`} placeholder="Filtrar pelo nome" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="max-h-64 overflow-y-auto rounded-xl border border-black/10 p-2">
            {visible.map((product) => (
              <label key={product.slug} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5">
                <input type="checkbox" checked={form.products.includes(product.slug)} onChange={() => toggleProduct(product.slug)} className="size-4 accent-[#b94f01]" />
                {product.name}
              </label>
            ))}
          </div>
          {error("products")}
        </fieldset>
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

/** "Avisar lista de espera" (um e-mail por pessoa, uma vez só; desligado sem o Resend). */
export function NotifyWaitlist({ dropId, enabled, released }: { dropId: string; enabled: boolean; released: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const notify = () =>
    start(async () => {
      if (!window.confirm("Enviar o aviso de lançamento para a lista de espera? Quem já recebeu não recebe de novo.")) return;
      const result = await notifyDropWaitlist(dropId);
      setMessage(result.ok ? { tone: "ok", text: `Enviados: ${result.sent}. Falharam: ${result.failed}. Já avisados antes: ${result.skipped}.` } : { tone: "error", text: result.message });
    });
  return (
    <div>
      <button type="button" onClick={notify} disabled={!enabled || !released || pending} className="inline-flex items-center gap-2 rounded-xl bg-[#b94f01] px-5 py-3 text-sm font-medium text-white hover:bg-[#9f4300] disabled:cursor-not-allowed disabled:bg-black/25">
        {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Avisar lista de espera
      </button>
      {!enabled && <p className="mt-2 text-xs text-black/60">E-mail desligado: configure RESEND_API_KEY e EMAIL_FROM.</p>}
      {enabled && !released && <p className="mt-2 text-xs text-black/60">Disponível depois do lançamento.</p>}
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.tone === "error" ? "text-[#b42318]" : "text-black/70"}`}>{message.text}</p>}
    </div>
  );
}
