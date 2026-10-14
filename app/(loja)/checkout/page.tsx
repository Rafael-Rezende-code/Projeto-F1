import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Sacola", href: "/carrinho" }, { label: "Finalizar compra" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Checkout" title="Finalizar compra" body="Ambiente de demonstração: nenhum pagamento é cobrado e nenhum pedido é enviado." />
        </div>
        <CheckoutForm />
      </div>
    </div>
  );
}
