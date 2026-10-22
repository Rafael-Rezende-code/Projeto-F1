import type { Metadata } from "next";
import { privateRobots } from "@/lib/indexing";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OrderLookup } from "@/components/order-lookup";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = { title: "Consultar pedido", description: "Acompanhe seu pedido com o número e o e-mail da compra.", robots: privateRobots };

export default async function ConsultarPedidoPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Consultar pedido" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Seu pedido" title="Onde está meu pedido?" body="Informe o número do pedido e o e-mail usado na compra para ver o status e o rastreio." />
        </div>
        <OrderLookup defaultOrder={typeof pedido === "string" ? pedido.slice(0, 40) : undefined} />
      </div>
    </div>
  );
}
