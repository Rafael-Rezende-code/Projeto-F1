import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, Truck, XCircle } from "lucide-react";
import { CopyButton } from "@/components/checkout/copy-button";
import { OrderStatusPoller } from "@/components/checkout/order-status-poller";
import { DispatchSummary } from "@/components/dispatch-summary";
import { ORDER_ITEM_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_LABELS, type Order } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";

// Página de status do pedido (usada no modo gravado, lida no servidor, e no simulado, lida do sessionStorage):
// aprovado, Pix (QR Code + copia e cola), boleto (link + linha digitável), cartão em análise, recusado, cancelado e
// enviado (código de rastreio). Nada de dado sensível do cartão: só bandeira e últimos 4 dígitos vindos do provedor.

const BRANDS: Record<string, string> = { visa: "Visa", master: "Mastercard", amex: "American Express", elo: "Elo", hipercard: "Hipercard" };

function headline(order: Order) {
  const pix = order.payment.details?.pix;
  const boleto = order.payment.details?.boleto;
  switch (order.status) {
    case "confirmado":
    case "pago":
      return { icon: "ok", title: "Pedido confirmado.", text: "O pagamento foi aprovado. Agora é com a gente: separamos seus itens e avisamos quando saírem para entrega." } as const;
    case "recusado":
      return { icon: "no", title: "Pagamento recusado.", text: "O pagamento não foi aprovado e nada foi cobrado. Confira os dados ou tente outra forma de pagamento." } as const;
    case "cancelado":
      return { icon: "no", title: "Pedido cancelado.", text: "Este pedido foi cancelado e nada foi cobrado. Os itens voltaram para o estoque." } as const;
    case "enviado":
    case "entregue":
      return { icon: "ship", title: order.status === "entregue" ? "Pedido entregue." : "Pedido a caminho.", text: "Seu pedido já saiu. Acompanhe a entrega pelo código de rastreio." } as const;
    default:
      if (pix) return { icon: "wait", title: "Falta só o Pix.", text: "Pague com o QR Code ou o código copia e cola. Assim que o pagamento cair, esta página se atualiza e enviamos a confirmação por e-mail." } as const;
      if (boleto) return { icon: "wait", title: "Boleto gerado.", text: "Pague até o vencimento. A confirmação do banco leva até 3 dias úteis; avisamos por e-mail assim que ela chegar." } as const;
      if (order.payment.method === "cartao" && !order.simulated) return { icon: "wait", title: "Pagamento em análise.", text: "O emissor do cartão está analisando o pagamento. Avisamos por e-mail assim que houver resposta." } as const;
      return { icon: "ok", title: "Pedido recebido.", text: "Assim que o pagamento for confirmado, separamos seus itens e enviamos as atualizações por e-mail." } as const;
  }
}

export function OrderView({ order }: { order: Order }) {
  const head = headline(order);
  const { pix, boleto, card } = order.payment.details ?? {};
  const pending = order.status === "aguardando-pagamento";
  const Icon = head.icon === "ok" ? CheckCircle2 : head.icon === "no" ? XCircle : head.icon === "ship" ? Truck : Clock3;
  const iconColor = head.icon === "ok" || head.icon === "ship" ? "text-[#1f7a3a]" : head.icon === "no" ? "text-[#b42318]" : "text-[#b94f01]";
  // Status por item (refino 2) só depois do pagamento: antes disso nada foi separado nem encomendado.
  const hasItemStatus = ["confirmado", "pago", "enviado", "entregue"].includes(order.status);
  const brand = card?.brand ? (BRANDS[card.brand] ?? card.brand.toUpperCase()) : undefined;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
      {pending && !order.simulated && <OrderStatusPoller />}
      <div>
        <Icon size={40} strokeWidth={1.5} className={iconColor} aria-hidden="true" />
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pedido {order.id}</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">{head.title}</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-black/60 sm:text-base">
          Obrigado, {order.customer.name.split(" ")[0]}. {head.text} As atualizações vão para <strong className="font-medium text-black">{order.customer.email}</strong>.
        </p>
        {order.simulated && <p className="mt-4 inline-block rounded-md bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">Pedido simulado · nada foi cobrado</p>}

        {pending && pix && (
          <section aria-labelledby="pix" className="mt-8 rounded-2xl border border-black/10 p-5 sm:p-6">
            <h2 id="pix" className="font-ui text-sm font-medium">Pague com Pix</h2>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
              {pix.qrCodeBase64 && (
                // eslint-disable-next-line @next/next/no-img-element -- QR Code em base64 vindo do provedor
                <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code do Pix" width={200} height={200} className="size-[200px] shrink-0 rounded-xl border border-black/10 bg-white p-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-black/60">Abra o app do seu banco, escolha Pix e leia o QR Code. Ou copie o código abaixo e cole em “Pix copia e cola”.</p>
                <label htmlFor="pix-codigo" className="mt-4 block text-xs font-medium text-black/70">Código Pix copia e cola</label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input id="pix-codigo" readOnly value={pix.qrCode} className="min-w-0 flex-1 truncate rounded-xl border border-black/15 bg-[#f5f5f3] px-3 py-2.5 font-mono text-xs text-black" />
                  <CopyButton value={pix.qrCode} label="Copiar código" />
                </div>
                {pix.expiresAt && <p className="mt-3 text-xs text-black/60">Válido até {new Date(pix.expiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p>}
              </div>
            </div>
          </section>
        )}

        {pending && boleto && (
          <section aria-labelledby="boleto" className="mt-8 rounded-2xl border border-black/10 p-5 sm:p-6">
            <h2 id="boleto" className="font-ui text-sm font-medium">Boleto</h2>
            <a href={boleto.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">
              Abrir o boleto <span className="sr-only">(abre em nova aba)</span>
            </a>
            {boleto.barcode && (
              <div className="mt-5">
                <label htmlFor="boleto-linha" className="block text-xs font-medium text-black/70">Linha digitável</label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input id="boleto-linha" readOnly value={boleto.barcode} className="min-w-0 flex-1 truncate rounded-xl border border-black/15 bg-[#f5f5f3] px-3 py-2.5 font-mono text-xs text-black" />
                  <CopyButton value={boleto.barcode} label="Copiar linha" />
                </div>
              </div>
            )}
            {boleto.expiresAt && <p className="mt-3 text-xs text-black/60">Vencimento: {new Date(boleto.expiresAt).toLocaleDateString("pt-BR")}.</p>}
          </section>
        )}

        {order.payment.instructions && !pix && !boleto && (
          <div className="mt-8 rounded-2xl border border-black/10 p-5">
            <h2 className="font-ui text-sm font-medium">{PAYMENT_LABELS[order.payment.method]}</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">{order.payment.instructions}</p>
          </div>
        )}

        {order.tracking && (
          <div className="mt-8 rounded-2xl border border-black/10 p-5 text-sm">
            <h2 className="font-ui font-medium">Rastreio</h2>
            <p className="mt-2 font-mono text-black">{order.tracking.code}</p>
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
            <p className="mt-2 text-black/60">
              {PAYMENT_LABELS[order.payment.method]}
              {brand ? ` ${brand}` : ""}
              {card?.last4 ? ` final ${card.last4}` : ""}
              {card?.installments && card.installments > 1 ? ` em ${card.installments}x` : ""} ({ORDER_STATUS_LABELS[order.status].toLowerCase()})
            </p>
            {order.payment.reference && <p className="text-black/60">Referência: {order.payment.reference}</p>}
          </div>
        </div>
        {order.status === "recusado" ? (
          <Link href="/checkout" className="mt-10 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">Tentar de novo</Link>
        ) : (
          <Link href="/produtos" className="mt-10 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">Continuar comprando</Link>
        )}
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
                  {line.status && hasItemStatus && (
                    <p className="text-xs text-black/60">
                      {line.fulfillment === "sob_encomenda" ? "Sob encomenda · " : ""}
                      <span className="font-medium text-black">{ORDER_ITEM_STATUS_LABELS[line.status]}</span>
                    </p>
                  )}
                  {line.tracking && <p className="font-mono text-xs text-black">Rastreio: {line.tracking}</p>}
                </div>
                <p className="whitespace-nowrap">{formatPrice(line.unitPriceCents * line.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
        <DispatchSummary items={order.lines} className="mt-5" />
        <dl className="mt-6 flex flex-col gap-2 border-t border-black/10 pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60">Entrega</dt><dd>{order.shipping.priceCents === 0 ? "Grátis" : formatPrice(order.shipping.priceCents)}</dd></div>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base font-medium"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
