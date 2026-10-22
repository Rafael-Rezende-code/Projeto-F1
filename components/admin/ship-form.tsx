"use client";

import { useActionState } from "react";
import { markShipped, type ShipState } from "@/app/admin/pedidos/actions";

export function ShipForm({ id, tracking }: { id: string; tracking?: string }) {
  const [state, action, pending] = useActionState<ShipState, FormData>(markShipped, {});
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="rastreio" className="mb-1.5 block text-xs font-medium text-black/70">Código de rastreio</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="rastreio" name="tracking" defaultValue={tracking} placeholder="AA123456789BR" className="min-w-0 flex-1 rounded-xl border border-black/15 px-3 py-2.5 font-mono text-sm uppercase" />
        <button type="submit" disabled={pending} className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-[#b94f01] disabled:opacity-60">
          {pending ? "Salvando…" : tracking ? "Atualizar código" : "Marcar como enviado"}
        </button>
      </div>
      {state.message && <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-[#1f7a3a]" : "text-[#b42318]"}`}>{state.message}</p>}
    </form>
  );
}
