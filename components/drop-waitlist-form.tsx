"use client";

import { useActionState, useId } from "react";
import { Bell } from "lucide-react";
import { joinDropWaitlist, type DropWaitlistState } from "@/app/actions/drops";
import { DROP_WAITLIST_CONSENT_LABEL, DROP_WAITLIST_PURPOSE } from "@/lib/drops-text";

// Lista de espera do drop (loja extra, item 6). Sem Supabase (`enabled` falso): desabilitado com "Em breve".
export function DropWaitlistForm({ dropId, enabled }: { dropId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<DropWaitlistState, FormData>(joinDropWaitlist, { status: "idle" });
  const id = useId();
  const done = state.status === "ok";
  return (
    <form id="lista-de-espera" action={action} className="scroll-mt-28 rounded-2xl bg-[#111] p-5 text-white sm:p-7" aria-labelledby={`${id}-titulo`}>
      <p id={`${id}-titulo`} className="flex items-center gap-2 text-lg font-medium tracking-[-0.03em]">
        <Bell size={18} strokeWidth={1.5} aria-hidden="true" /> Lista de espera
      </p>
      <p className="mt-1 text-sm text-white/70">Receba um e-mail na hora do lançamento.</p>
      <input type="hidden" name="drop" value={dropId} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {!done && (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`${id}-email`} className="sr-only">E-mail</label>
            <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="seu@email.com" disabled={!enabled} className="min-h-12 flex-1 rounded-xl border border-white/20 bg-white px-4 text-base text-black outline-none focus-visible:border-white disabled:opacity-60 sm:text-sm" />
            <button type="submit" disabled={!enabled || pending} className="min-h-12 rounded-xl bg-[#b94f01] px-6 text-sm font-medium text-white transition hover:bg-[#9f4300] disabled:cursor-not-allowed disabled:bg-white/20">
              {!enabled ? "Em breve" : pending ? "Enviando…" : "Avise-me"}
            </button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/80">
            <input type="checkbox" name="consent" required disabled={!enabled} className="mt-0.5 size-4 shrink-0 accent-[#b94f01]" />
            {DROP_WAITLIST_CONSENT_LABEL}
          </label>
          <p className="mt-2 text-xs leading-5 text-white/70">{DROP_WAITLIST_PURPOSE}</p>
        </>
      )}
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 text-sm ${state.status === "error" ? "text-[#ff8a7a]" : "text-[#7ddc9a]"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
