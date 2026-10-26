"use client";

import { useActionState, useId } from "react";
import { Bell } from "lucide-react";
import { requestStockAlert, type StockAlertState } from "@/app/actions/stock-alerts";
import { STOCK_ALERT_CONSENT_LABEL, STOCK_ALERT_PURPOSE } from "@/lib/stock-alerts-text";

// Formulário do "Avise-me quando chegar" (refino 3, item 2.4), dentro do quadro de compra quando o tamanho escolhido
// (ou o produto de tamanho único) está esgotado. Sem Supabase (`enabled` falso): botão desabilitado com "Em breve".
export function StockAlertForm({ sku, size, enabled }: { sku: string; size?: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<StockAlertState, FormData>(requestStockAlert, { status: "idle" });
  const id = useId();
  const done = state.status === "ok";
  return (
    <form action={action} className="rounded-xl border border-black/10 bg-[#f5f5f3] p-4 text-black" aria-labelledby={`${id}-titulo`}>
      <p id={`${id}-titulo`} className="flex items-center gap-2 text-sm font-medium">
        <Bell size={16} strokeWidth={1.5} aria-hidden="true" /> Avise-me quando chegar{size ? ` (tamanho ${size})` : ""}
      </p>
      <input type="hidden" name="sku" value={sku} />
      {/* Campo isca: escondido para pessoas e leitores de tela; robôs costumam preencher. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {!done && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`${id}-email`} className="sr-only">E-mail</label>
            <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="seu@email.com" disabled={!enabled} className="min-h-11 flex-1 rounded-xl border border-black/15 bg-white px-4 text-base text-black outline-none focus-visible:border-black disabled:opacity-60 sm:text-sm" />
            <button type="submit" disabled={!enabled || pending} className="min-h-11 rounded-xl bg-black px-5 text-sm font-medium text-white transition hover:bg-[#b94f01] disabled:cursor-not-allowed disabled:bg-black/30">
              {!enabled ? "Em breve" : pending ? "Enviando…" : "Avise-me"}
            </button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-black/70">
            <input type="checkbox" name="consent" required disabled={!enabled} className="mt-0.5 size-4 shrink-0 accent-[#b94f01]" />
            {STOCK_ALERT_CONSENT_LABEL}
          </label>
          <p className="mt-2 text-xs leading-5 text-black/60">{STOCK_ALERT_PURPOSE}</p>
        </>
      )}
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 text-sm ${state.status === "error" ? "text-[#b42318]" : "text-[#1f7a3a]"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
