"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ORDER_STORAGE_PREFIX, PAYMENT_LABELS, type Order } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";

// Confirmação do pedido. Como os pedidos são simulados (sem banco), o resumo vem do sessionStorage desta aba.
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

  const approved = order.status === "confirmado";
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
      <div>
        <CheckCircle2 size={40} strokeWidth={1.5} className="text-[#1f7a3a]" aria-hidden="true" />
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pedido {order.id}</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">{approved ? "Pedido confirmado." : "Pedido recebido."}</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-black/60 sm:text-base">
          Obrigado, {order.customer.name.split(" ")[0]}. {approved ? "O pagamento foi aprovado" : "Assim que o pagamento for confirmado, separamos seus itens"} e enviamos as atualizações para{" "}
          <strong className="font-medium text-black">{order.customer.email}</strong>.
        </p>
        <p className="mt-4 inline-block rounded-md bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">Pedido simulado · nada foi cobrado</p>

        {order.payment.instructions && (
          <div className="mt-8 rounded-2xl border border-black/10 p-5">
            <h2 className="font-ui text-sm font-medium">{PAYMENT_LABELS[order.payment.method]}</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">{order.payment.instructions}</p>
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 p-5 text-sm leading-6">
            <h2 className="font-ui font-medium">Entrega</h2>
            <p className="mt-2 text-black/60">
              {order.address.street}, {order.address.number}{order.address.complement ? ` – ${order.address.complement}` : ""}
              <br />
              {order.address.district} · {order.address.city}/{order.address.state}
              <br />
              CEP {order.address.cep}
            </p>
            <p className="mt-2 text-black/60">{order.shipping.label} · {order.shipping.days}</p>
          </div>
          <div className="rounded-2xl border border-black/10 p-5 text-sm leading-6">
            <h2 className="font-ui font-medium">Pagamento</h2>
            <p className="mt-2 text-black/60">{PAYMENT_LABELS[order.payment.method]} ({approved ? "aprovado" : "aguardando pagamento"})</p>
            <p className="text-black/60">Referência: {order.payment.reference}</p>
          </div>
        </div>
        <Link href="/produtos" className="mt-10 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">Continuar comprando</Link>
      </div>

      <aside aria-labelledby="resumo-pedido" className="h-fit rounded-2xl bg-[#f5f5f3] p-6">
        <h2 id="resumo-pedido" className="font-ui text-lg font-medium tracking-[-0.03em]">Resumo</h2>
        <ul role="list" className="mt-5 flex flex-col gap-4">
          {order.lines.map((line) => (
            <li key={line.sku} className="flex gap-3">
              <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-[#e9e8e4]">
                {line.image && <Image src={line.image} alt="" fill sizes="56px" quality={75} className="object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{line.name}</p>
                  <p className="text-xs text-black/60">Tam. {line.size} · Qtd. {line.quantity}</p>
                </div>
                <p className="whitespace-nowrap">{formatPrice(line.unitPriceCents * line.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-6 flex flex-col gap-2 border-t border-black/10 pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60">Entrega</dt><dd>{order.shipping.priceCents === 0 ? "Grátis" : formatPrice(order.shipping.priceCents)}</dd></div>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base font-medium"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
