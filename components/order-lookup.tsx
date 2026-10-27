"use client";

import { personalizationLabel } from "@/lib/personalization";
import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { lookupOrder, type LookupState } from "@/app/(loja)/pedido/consultar/actions";
import { ORDER_ITEM_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_LABELS } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";
import { ReviewForm } from "@/components/review-form";
import type { OrderLookup as Lookup } from "@/lib/orders/lookup";

const INPUT = "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base outline-none focus-visible:border-black sm:text-sm";
const dateBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

// Formulário de /pedido/consultar (operação 1d). O resultado mostra só acompanhamento: status, itens, entrega (cidade/UF)
// e rastreio. A busca é a server action lookupOrder (limite por IP, resposta igual para "não existe" e "e-mail errado").
export function OrderLookup({ defaultOrder }: { defaultOrder?: string }) {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupOrder, { status: "idle" });
  const failed = state.status !== "idle" && state.status !== "found";
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="consulta-pedido" className="text-sm font-medium">Número do pedido</label>
          <input id="consulta-pedido" name="pedido" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="APX-…" defaultValue={state.values?.pedido ?? defaultOrder} className={`${INPUT} font-mono uppercase`} aria-describedby={failed ? "consulta-erro" : undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="consulta-email" className="text-sm font-medium">E-mail da compra</label>
          <input id="consulta-email" name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={state.values?.email} className={INPUT} aria-describedby={failed ? "consulta-erro" : undefined} />
        </div>
        <button type="submit" disabled={pending} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-[#b94f01] disabled:opacity-60">
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Consultar pedido
        </button>
        <p role="status" aria-live="polite" id="consulta-erro" className={failed ? "rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#8a1c12]" : "sr-only"}>
          {failed ? state.message : state.status === "found" ? `Pedido ${state.order?.id} encontrado.` : ""}
        </p>
        <p className="text-xs leading-5 text-black/60">O número do pedido está no e-mail de confirmação e na página que abriu depois da compra.</p>
      </form>
      {state.status === "found" && state.order && <LookupResult order={state.order} reviews={state.reviews} values={state.values} />}
    </div>
  );
}

function LookupResult({ order, reviews, values }: { order: Lookup; reviews?: LookupState["reviews"]; values?: LookupState["values"] }) {
  return (
    <section aria-labelledby="consulta-resultado" className="rounded-2xl bg-[#f5f5f3] p-6 sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pedido {order.id}</p>
      <h2 id="consulta-resultado" className="font-ui mt-3 text-2xl font-medium tracking-[-0.03em]">{ORDER_STATUS_LABELS[order.status]}</h2>
      <p className="mt-1 text-sm text-black/60">Feito em {dateBR(order.createdAt)} · {PAYMENT_LABELS[order.paymentMethod]} · {formatPrice(order.totalCents)}</p>

      {order.tracking && (
        <div className="mt-6 rounded-xl border border-black/10 bg-white p-4 text-sm">
          <p className="font-medium">Rastreio</p>
          <p className="mt-1 font-mono">{order.tracking.code}</p>
          {order.tracking.shippedAt && <p className="mt-1 text-xs text-black/60">Enviado em {dateBR(order.tracking.shippedAt)}</p>}
        </div>
      )}

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-black/60">Entrega</dt>
          <dd className="mt-1">{order.shipping.label}{order.shipping.days ? ` · ${order.shipping.days}` : ""}</dd>
        </div>
        {order.city && (
          <div>
            <dt className="text-black/60">Destino</dt>
            <dd className="mt-1">{order.city}/{order.state}</dd>
          </div>
        )}
      </dl>

      <ul role="list" className="mt-6 flex flex-col gap-4 border-t border-black/10 pt-6">
        {order.items.map((item) => (
          <li key={`${item.slug}-${item.size}-${personalizationLabel(item.personalization)}`} className="flex gap-3">
            <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-[#e9e8e4]">
              {item.image && <Image src={item.image} alt="" fill sizes="56px" quality={75} className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <Link href={`/produtos/${item.slug}`} className="font-medium hover:underline">{item.name}</Link>
              <p className="text-xs text-black/60">Tam. {item.size} · Qtd. {item.quantity}</p>
              {item.personalization && <p className="text-xs font-medium text-black" data-personalization>{personalizationLabel(item.personalization)}</p>}
              {item.status && <p className="text-xs font-medium">{ORDER_ITEM_STATUS_LABELS[item.status]}</p>}
              {item.tracking && item.tracking !== order.tracking?.code && <p className="font-mono text-xs">Rastreio: {item.tracking}</p>}
              {/* Avaliação (refino 3): pedido entregue, avaliações ligadas, uma por produto. */}
              {reviews?.enabled && values && order.items.findIndex((other) => other.slug === item.slug) === order.items.indexOf(item) && (reviews.reviewed.includes(item.slug) ? <p className="mt-1 text-xs text-black/60">Avaliação enviada.</p> : <ReviewForm orderId={order.id} email={values.email} slug={item.slug} name={item.name} />)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
