"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { cancelOrder, markRefunded, type OrderActionState } from "@/app/admin/pedidos/actions";

// Ações destrutivas do pedido (operação, fase 2) com modal de confirmação: <dialog> nativo (foco preso, Esc fecha,
// foco volta ao botão). Quem decide e grava é o banco (cancel_order / mark_order_refunded).
function ActionDialog({ id, label, title, children, action, confirm, tone = "danger" }: {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
  action: (state: OrderActionState, form: FormData) => Promise<OrderActionState>;
  confirm: string;
  tone?: "danger" | "neutral";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, run, pending] = useActionState<OrderActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok) dialog.current?.close();
  }, [state]);
  const titleId = `${label.replace(/\W+/g, "-").toLowerCase()}-titulo`;
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={`rounded-xl px-4 py-2.5 text-sm font-medium ${tone === "danger" ? "border border-[#b42318]/40 text-[#b42318] hover:bg-[#b42318]/5" : "border border-black/15 hover:border-black"}`}
      >
        {label}
      </button>
      {state.ok && state.message && <p role="status" className="mt-2 text-sm text-[#1f7a3a]">{state.message}</p>}
      <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[min(92vw,480px)] rounded-2xl bg-white p-0 text-black backdrop:bg-black/40">
        <form action={run} className="flex flex-col gap-4 p-6">
          <input type="hidden" name="id" value={id} />
          <h2 id={titleId} className="font-ui text-lg font-medium">{title}</h2>
          {children}
          {!state.ok && state.message && <p role="alert" className="text-sm text-[#b42318]">{state.message}</p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-medium hover:border-black">Voltar</button>
            <button type="submit" disabled={pending} className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${tone === "danger" ? "bg-[#b42318] hover:bg-[#8a1c12]" : "bg-black hover:bg-[#b94f01]"}`}>
              {pending ? "Salvando…" : confirm}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

const FIELD = "w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm";

export function CancelOrderDialog({ id, shipped }: { id: string; shipped: boolean }) {
  return (
    <ActionDialog id={id} label="Cancelar pedido" title={`Cancelar o pedido ${id}?`} action={cancelOrder} confirm="Cancelar pedido">
      <p className="text-sm leading-6 text-black/70">O estoque dos itens e o uso do cupom voltam. Isso não estorna o pagamento: faça o reembolso no provedor e registre aqui depois.</p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Motivo (fica no histórico)
        <textarea name="reason" required minLength={3} maxLength={500} rows={3} className={FIELD} />
      </label>
      {shipped && (
        <label className="flex items-start gap-2 rounded-xl bg-[#fdecea] p-3 text-sm text-[#8a1c12]">
          <input type="checkbox" name="confirmShipped" required className="mt-1" />
          Este pedido JÁ FOI ENVIADO. Confirmo que quero cancelar mesmo assim (ex.: extravio ou devolução recebida).
        </label>
      )}
    </ActionDialog>
  );
}

export function RefundDialog({ id }: { id: string }) {
  return (
    <ActionDialog id={id} label="Marcar como reembolsado" title={`Registrar reembolso do pedido ${id}`} action={markRefunded} confirm="Registrar reembolso" tone="neutral">
      <p className="text-sm leading-6 text-black/70">Só registra: o dinheiro é devolvido no painel do provedor (Mercado Pago). Anote como e quando foi feito.</p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Detalhes do reembolso
        <textarea name="note" required minLength={3} maxLength={500} rows={3} placeholder="Ex.: estorno total no cartão em 23/10, id 123…" className={FIELD} />
      </label>
    </ActionDialog>
  );
}
