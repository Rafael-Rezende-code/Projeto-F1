import type { Metadata } from "next";
import { privateRobots } from "@/lib/indexing";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageIntro } from "@/components/page-intro";
import { mercadoPagoConfigured } from "@/lib/payments/mercado-pago";
import { isOrderStoreConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Finalizar compra", robots: privateRobots };

// O modo (simulado ou Mercado Pago) vem das variáveis de ambiente no build: depois de configurá-las, faça um novo deploy.
export default function CheckoutPage() {
  const live = mercadoPagoConfigured();
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Sacola", href: "/carrinho" }, { label: "Finalizar compra" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Checkout" title="Finalizar compra" body={live ? "Pagamento processado pelo Mercado Pago, em ambiente seguro." : "Ambiente de demonstração: nenhum pagamento é cobrado e nenhum pedido é enviado."} />
        </div>
        <CheckoutForm mpPublicKey={live ? process.env.NEXT_PUBLIC_MP_PUBLIC_KEY : undefined} couponsEnabled={isOrderStoreConfigured()} />
      </div>
    </div>
  );
}
