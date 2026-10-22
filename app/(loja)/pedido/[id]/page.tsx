import type { Metadata } from "next";
import { privateRobots } from "@/lib/indexing";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { OrderView } from "@/components/checkout/order-view";
import Link from "next/link";
import { WhatsAppTopic } from "@/components/whatsapp";
import { getOrderForCustomer } from "@/lib/orders/store";
import { isOrderStoreConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Pedido", robots: privateRobots };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

// Pedido gravado (Supabase): lido no servidor com a chave do link (?t=). Simulado: lido do sessionStorage no cliente.
export default async function PedidoPage({ params, searchParams }: Props) {
  const id = decodeURIComponent((await params).id);
  const { t } = await searchParams;
  const stored = isOrderStoreConfigured() && t ? await getOrderForCustomer(id, t) : null;
  return (
    <div className="px-5 pb-24 pt-12 sm:px-10 sm:pt-16">
      <WhatsAppTopic order={id} />
      <div className="mx-auto max-w-[1400px]">
        {stored ? (
          <OrderView order={stored} />
        ) : isOrderStoreConfigured() ? (
          // Pedido gravado sem a chave do link (ou com chave errada): a consulta por número + e-mail resolve.
          <div className="mx-auto max-w-lg rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pedido {id}</p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-0.05em]">Este link não abre o pedido.</h1>
            <p className="mt-4 text-sm leading-6 text-black/60">Use o link do e-mail de confirmação ou consulte com o número do pedido e o e-mail da compra.</p>
            <Link href={`/pedido/consultar?pedido=${encodeURIComponent(id)}`} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-[#b94f01]">Consultar pedido</Link>
          </div>
        ) : (
          <OrderConfirmation id={id} />
        )}
      </div>
    </div>
  );
}
