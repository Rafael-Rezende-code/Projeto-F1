import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipForm } from "@/components/admin/ship-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { ORDER_STATUS_LABELS, orderUrl, PAYMENT_LABELS } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";
import { orderFromRow, type OrderRow } from "@/lib/orders/mapping";

// Detalhe do pedido: itens, cliente, entrega, pagamento e envio (código de rastreio).
export default async function AdminPedido({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const id = decodeURIComponent((await params).id);
  const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as OrderRow;
  const order = orderFromRow(row);
  const card = order.payment.details?.card;
  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm text-black/60 hover:underline">← Pedidos</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">{order.id}</h1>
        <span className="rounded-xl bg-white px-3 py-2 text-sm font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
      </div>
      <p className="mt-1 text-sm text-black/60">{new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl bg-white p-6">
          <h2 className="font-medium">Itens</h2>
          <ul role="list" className="mt-4 divide-y divide-black/5">
            {order.lines.map((line) => (
              <li key={line.sku} className="flex justify-between gap-4 py-3 text-sm">
                <span>{line.name}<span className="block text-xs text-black/60">SKU {line.sku} · Tam. {line.size} · Qtd. {line.quantity}</span></span>
                <span className="whitespace-nowrap">{formatPrice(line.unitPriceCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
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
        </div>
      </div>
    </div>
  );
}
