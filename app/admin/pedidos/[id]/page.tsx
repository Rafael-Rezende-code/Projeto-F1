import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelOrderDialog, RefundDialog } from "@/components/admin/order-dialogs";
import { ShipForm } from "@/components/admin/ship-form";
import { setOrderTest } from "@/app/admin/pedidos/actions";
import { canCancel, needsShippedConfirmation } from "@/lib/admin/order-actions";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { ORDER_ITEM_STATUS_ADMIN_LABELS, ORDER_STATUS_LABELS, orderUrl, PAYMENT_LABELS } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";
import { orderFromRow, type OrderRow } from "@/lib/orders/mapping";

type Extra = { is_test?: boolean; cancel_reason?: string | null; cancelled_at?: string | null; refunded_at?: string | null; refund_note?: string | null };
type EventRow = { id: number; kind: string; message: string; actor: string; created_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

// Detalhe do pedido: itens, cliente, entrega, pagamento, envio (código de rastreio), histórico (order_events),
// cancelamento/reembolso (com confirmação) e a marca de pedido de teste.
export default async function AdminPedido({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const id = decodeURIComponent((await params).id);
  const [{ data }, { data: eventRows }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle(),
    supabase.from("order_events").select("id, kind, message, actor, created_at").eq("order_id", id).order("id", { ascending: true }),
  ]);
  if (!data) notFound();
  const row = data as OrderRow;
  const extra = data as Extra;
  const events = (eventRows ?? []) as EventRow[];
  const order = orderFromRow(row);
  const card = order.payment.details?.card;
  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm text-black/60 hover:underline">← Pedidos</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">{order.id}</h1>
        <span className="flex flex-wrap gap-2">
          {extra.is_test && <span className="rounded-md bg-[#fff4d6] px-2 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a5200]">Teste</span>}
          {extra.refunded_at && <span className="rounded-md bg-[#e8f3ec] px-2 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#1f5a33]">Reembolsado</span>}
          <span className="rounded-xl bg-white px-3 py-2 text-sm font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
        </span>
      </div>
      <p className="mt-1 text-sm text-black/60">{new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Itens</h2>
            {order.lines.some((line) => line.status === "aguardando-compra") && <Link href="/admin/fornecedor" className="text-xs underline underline-offset-4">Comprar no fornecedor →</Link>}
          </div>
          <ul role="list" className="mt-4 divide-y divide-black/5">
            {order.lines.map((line, index) => {
              const item = row.order_items?.[index];
              return (
              <li key={line.sku} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {line.name}
                  <span className="block text-xs text-black/60">SKU {line.sku} · Tam. {line.size} · Qtd. {line.quantity}</span>
                  {line.status && (
                    <span className="block text-xs text-black/60">
                      {line.fulfillment === "sob_encomenda" ? "Sob encomenda" : "Estoque próprio"} · <span className="font-medium text-black">{ORDER_ITEM_STATUS_ADMIN_LABELS[line.status]}</span>
                      {item?.supplier_tracking_code && <> · fornecedor <span className="font-mono">{item.supplier_tracking_code}</span></>}
                      {line.tracking && <> · cliente <span className="font-mono">{line.tracking}</span></>}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">{formatPrice(line.unitPriceCents * line.quantity)}</span>
              </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
            {order.coupon && order.coupon.discountCents > 0 && <div className="flex justify-between"><dt className="text-black/60">Cupom {order.coupon.code}</dt><dd>−{formatPrice(order.coupon.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-black/60">Entrega ({order.shipping.label})</dt><dd>{order.shipping.priceCents ? formatPrice(order.shipping.priceCents) : "Grátis"}</dd></div>
            <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
          </dl>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 text-sm leading-6">
            <h2 className="font-medium">Cliente</h2>
            <p className="mt-2">{order.customer.name}<br /><a href={`mailto:${order.customer.email}`} className="underline">{order.customer.email}</a>{row.customer_phone && <><br />{row.customer_phone}</>}</p>
            <h2 className="mt-5 font-medium">Entrega</h2>
            <p className="mt-2 text-black/70">
              {order.address.street}, {order.address.number}{order.address.complement ? ` – ${order.address.complement}` : ""}<br />
              {order.address.district} · {order.address.city}/{order.address.state} · CEP {order.address.cep}<br />
              {order.shipping.label} · {order.shipping.days}
            </p>
            <h2 className="mt-5 font-medium">Pagamento</h2>
            <p className="mt-2 text-black/70">
              {PAYMENT_LABELS[order.payment.method]}{card?.brand ? ` ${card.brand}` : ""}{card?.last4 ? ` final ${card.last4}` : ""}{card?.installments && card.installments > 1 ? ` em ${card.installments}x` : ""}
              <br />Provedor: {order.payment.provider || "—"} · Ref.: {order.payment.reference || "—"}
              <br />Status do provedor: {row.payment_status ?? "—"}
            </p>
            <p className="mt-4"><Link href={orderUrl(order)} target="_blank" className="underline underline-offset-4">Página do cliente</Link></p>
          </section>
          <section className="rounded-2xl bg-white p-6">
            <h2 className="font-medium">Envio</h2>
            {order.status === "pago" || order.status === "enviado" ? (
              <ShipForm id={order.id} tracking={order.tracking?.code} />
            ) : (
              <p className="mt-2 text-sm text-black/60">Disponível depois que o pagamento for aprovado.</p>
            )}
            {order.tracking?.shippedAt && <p className="mt-3 text-xs text-black/60">Enviado em {new Date(order.tracking.shippedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p>}
          </section>
          <section className="rounded-2xl bg-white p-6 text-sm">
            <h2 className="font-medium">Cancelamento e reembolso</h2>
            {extra.cancel_reason && <p className="mt-2 text-black/70">Cancelado{extra.cancelled_at ? ` em ${when(extra.cancelled_at)}` : ""}: {extra.cancel_reason}</p>}
            {extra.refunded_at && <p className="mt-2 text-black/70">Reembolso registrado em {when(extra.refunded_at)}: {extra.refund_note}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {canCancel(order.status) && <div><CancelOrderDialog id={order.id} shipped={needsShippedConfirmation(order.status)} /></div>}
              {order.status === "cancelado" && !extra.refunded_at && <div><RefundDialog id={order.id} /></div>}
            </div>
            <form action={setOrderTest} className="mt-5 border-t border-black/10 pt-4">
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="isTest" value={extra.is_test ? "false" : "true"} />
              <p className="text-xs text-black/60">{extra.is_test ? "Pedido de teste: fora dos indicadores." : "Pedido de teste? Ele sai dos indicadores do painel."}</p>
              <button type="submit" className="mt-2 rounded-xl border border-black/15 px-3 py-2 text-xs font-medium hover:border-black">{extra.is_test ? "Desmarcar teste" : "Marcar como teste"}</button>
            </form>
          </section>
        </div>
      </div>

      <section aria-labelledby="historico" className="mt-6 rounded-2xl bg-white p-6">
        <h2 id="historico" className="font-medium">Histórico</h2>
        {events.length ? (
          <ol className="mt-4 border-l border-black/10 pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative pb-4 text-sm last:pb-0">
                <span aria-hidden="true" className={`absolute -left-[25px] top-1.5 size-2 rounded-full ${event.kind === "cancelado" ? "bg-[#b42318]" : event.kind === "reembolsado" ? "bg-[#1f7a3a]" : "bg-black/40"}`} />
                <p>{event.message}</p>
                <p className="text-xs text-black/60"><time dateTime={event.created_at}>{when(event.created_at)}</time> · {event.actor}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-black/60">Sem registros (pedidos anteriores à migração de histórico não têm eventos).</p>
        )}
      </section>
    </div>
  );
}
