"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveCoupon, setCouponActive } from "@/app/admin/cupons/actions";
import type { CouponForm } from "@/lib/admin/coupon-schema";

const EMPTY: CouponForm = { code: "", kind: "percentual", percent: "10", amount: "", minSubtotal: "", startsAt: "", endsAt: "", maxUses: "", active: true, note: "" };
const input = "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black/10";
const label = "mb-1.5 block text-xs font-medium text-black/70";

// Formulário de cupom (operação, fase 1c). Validação no servidor (lib/admin/coupon-schema.ts).
export function CouponFormView({ initial }: { initial?: CouponForm }) {
  const router = useRouter();
  const [form, setForm] = useState<CouponForm>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-[#b42318]">{errors[key]}</p>;

  const submit = () =>
    start(async () => {
      setMessage(null);
      const result = await saveCoupon(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setErrors({});
      setMessage({ tone: "ok", text: "Cupom salvo." });
      if (!form.id) router.replace(`/admin/cupons/${result.id}`);
      else router.refresh();
    });

  const toggle = () =>
    start(async () => {
      if (!form.id) return;
      const result = await setCouponActive(form.id, !form.active);
      if (result.ok) set("active", !form.active);
      setMessage(result.ok ? { tone: "ok", text: form.active ? "Cupom desativado." : "Cupom ativado." } : { tone: "error", text: result.message });
    });

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="codigo">Código</label>
          <input id="codigo" className={`${input} uppercase`} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))} />
          {error("code")}
        </div>
        <div>
          <label className={label} htmlFor="tipo">Tipo</label>
          <select id="tipo" className={input} value={form.kind} onChange={(e) => set("kind", e.target.value as CouponForm["kind"])}>
            <option value="percentual">Percentual</option>
            <option value="valor_fixo">Valor fixo</option>
            <option value="frete_gratis">Frete grátis</option>
          </select>
        </div>
        {form.kind === "percentual" && (
          <div>
            <label className={label} htmlFor="percentual">Desconto (%)</label>
            <input id="percentual" inputMode="numeric" className={input} value={form.percent} onChange={(e) => set("percent", e.target.value)} />
            {error("percent")}
          </div>
        )}
        {form.kind === "valor_fixo" && (
          <div>
            <label className={label} htmlFor="valor">Desconto (R$)</label>
            <input id="valor" inputMode="decimal" placeholder="20,00" className={input} value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            {error("amount")}
          </div>
        )}
        <div>
          <label className={label} htmlFor="minimo">Subtotal mínimo (R$, opcional)</label>
          <input id="minimo" inputMode="decimal" placeholder="0,00" className={input} value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} />
          {error("minSubtotal")}
        </div>
        <div>
          <label className={label} htmlFor="inicio">Início (opcional, horário de Brasília)</label>
          <input id="inicio" type="datetime-local" className={input} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          {error("startsAt")}
        </div>
        <div>
          <label className={label} htmlFor="fim">Fim (opcional)</label>
          <input id="fim" type="datetime-local" className={input} value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          {error("endsAt")}
        </div>
        <div>
          <label className={label} htmlFor="limite">Limite de usos (vazio = sem limite)</label>
          <input id="limite" inputMode="numeric" className={input} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
          {error("maxUses")}
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="nota">Nota interna (opcional)</label>
          <input id="nota" className={input} value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#b94f01]" /> Ativo
        </label>
      </div>
      <p className="mt-4 text-xs leading-5 text-black/60">
        O desconto nunca passa do valor dos produtos. O cupom é conferido e contado no momento em que o pedido é criado; pedido
        cancelado devolve o uso.
      </p>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-4 rounded-xl p-3 text-sm ${message.tone === "error" ? "bg-[#b42318]/5 text-[#b42318]" : "bg-[#1f7a3a]/10 text-[#1f7a3a]"}`}>{message.text}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-[#b94f01] px-5 py-3 text-sm font-medium text-white hover:bg-[#9f4300] disabled:opacity-60">
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Salvar cupom
        </button>
        {form.id && (
          <button type="button" onClick={toggle} disabled={pending} className="rounded-xl border border-black/15 px-5 py-3 text-sm font-medium hover:border-black">
            {form.active ? "Desativar" : "Ativar"}
          </button>
        )}
        <Link href="/admin/cupons" className="rounded-xl px-5 py-3 text-sm text-black/60 hover:underline">Voltar</Link>
      </div>
    </div>
  );
}
