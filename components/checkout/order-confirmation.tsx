"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { OrderView } from "@/components/checkout/order-view";
import { ORDER_STORAGE_PREFIX, type Order } from "@/lib/checkout/order";

// Confirmação do pedido SIMULADO (sem banco): o resumo vem do sessionStorage desta aba e aparece em OrderView.
// Sem ele (outra aba, link compartilhado), mostra só o número do pedido.
function readOrder(id: string): string | null {
  try {
    return window.sessionStorage.getItem(ORDER_STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}
const subscribe = () => () => {};

export function OrderConfirmation({ id }: { id: string }) {
  // getServerSnapshot = undefined: no servidor (e na hidratação) ainda não lemos o armazenamento.
  const raw = useSyncExternalStore(subscribe, () => readOrder(id), () => undefined);
  if (raw === undefined) return <p className="py-16 text-sm text-black/60">Carregando o pedido…</p>;

  let order: Order | null = null;
  try {
    order = raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    order = null;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pedido {id}</p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.05em]">Não encontramos os detalhes deste pedido.</h1>
        <p className="mt-4 text-sm leading-6 text-black/60">
          Esta loja está em modo de demonstração: os pedidos não são gravados e o resumo só fica disponível na aba em que a compra foi feita.
        </p>
        <Link href="/produtos" className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">Voltar à coleção</Link>
      </div>
    );
  }

  return <OrderView order={order} />;
}
