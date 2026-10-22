"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { markPurchased, type SupplierState } from "@/app/admin/fornecedor/actions";

// Um item da fila "Comprar no fornecedor": link do produto no fornecedor, botão que copia endereço e dados do cliente,
// campo do rastreio do fornecedor e "Marcar comprado". Tudo manual (sem automação nem acesso ao marketplace).
export function SupplierItem({ itemId, status, supplierUrl, addressText, tracking }: { itemId: string; status: "aguardando-compra" | "comprado"; supplierUrl?: string | null; addressText: string; tracking?: string | null }) {
  const [state, action, pending] = useActionState<SupplierState, FormData>(markPurchased, {});
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(addressText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie os dados do cliente:", addressText);
    }
  };
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {supplierUrl ? (
          <a href={supplierUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:bg-[#b94f01]">
            Abrir no fornecedor <ExternalLink size={13} aria-hidden="true" /><span className="sr-only">(abre em nova aba)</span>
          </a>
        ) : (
          <span className="rounded-xl bg-[#b42318]/5 px-3 py-2 text-xs text-[#b42318]">Sem link do fornecedor no produto</span>
        )}
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-medium hover:border-black">
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? "Copiado" : "Copiar endereço e dados"}
        </button>
      </div>
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="intent" value={status === "aguardando-compra" ? "comprar" : "rastreio"} />
        <div className="min-w-0 flex-1">
          <label htmlFor={`rastreio-${itemId}`} className="mb-1 block text-[11px] font-medium text-black/70">Rastreio do fornecedor</label>
          <input id={`rastreio-${itemId}`} name="tracking" defaultValue={tracking ?? ""} placeholder="Opcional" className="w-full rounded-xl border border-black/15 px-3 py-2 font-mono text-sm uppercase placeholder:font-sans placeholder:normal-case" />
        </div>
        {status === "aguardando-compra" ? (
          <button type="submit" disabled={pending} className="rounded-xl bg-[#b94f01] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9f4300] disabled:opacity-60">{pending ? "Salvando…" : "Marcar comprado"}</button>
        ) : (
          <button type="submit" disabled={pending} className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-[#b94f01] disabled:opacity-60">{pending ? "Salvando…" : "Salvar rastreio"}</button>
        )}
      </form>
      {state.message && <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-[#1f7a3a]" : "text-[#b42318]"}`}>{state.message}</p>}
    </div>
  );
}
