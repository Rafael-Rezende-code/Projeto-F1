import type { Metadata } from "next";
import { privateRobots } from "@/lib/indexing";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageIntro } from "@/components/page-intro";
import { mercadoPagoConfigured } from "@/lib/payments/mercado-pago";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { CHECKOUT_BLOCKED_MESSAGE, checkoutModeFor } from "@/lib/checkout-mode";
import Link from "next/link";

export const metadata: Metadata = { title: "Finalizar compra", robots: privateRobots };

// O modo (simulado ou Mercado Pago) vem das variáveis de ambiente no build: depois de configurá-las, faça um novo deploy.
export default function CheckoutPage() {
  const live = mercadoPagoConfigured();
  const mode = checkoutModeFor(process.env, live);
  if (mode === "bloqueado")
    return (
      <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
        <div className="mx-auto max-w-xl rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center text-black">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Quase lá</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.05em]">Estamos finalizando a abertura da loja.</h1>
          <p className="mt-3 text-sm leading-6 text-black/60">{CHECKOUT_BLOCKED_MESSAGE} Sua sacola continua salva neste aparelho.</p>
          <Link href="/#newsletter" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">Avise-me na abertura</Link>
        </div>
      </div>
    );
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        {mode === "teste" && (
          <p role="note" className="mb-6 rounded-xl border border-dashed border-[#b94f01] bg-[#b94f01]/5 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#8a3a00]">
            Modo de teste · nenhum pagamento é cobrado
          </p>
        )}
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Sacola", href: "/carrinho" }, { label: "Finalizar compra" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Checkout" title="Finalizar compra" body={live ? "Pagamento processado pelo Mercado Pago, em ambiente seguro." : "Ambiente de demonstração: nenhum pagamento é cobrado e nenhum pedido é enviado."} />
        </div>
        <CheckoutForm mpPublicKey={live ? process.env.NEXT_PUBLIC_MP_PUBLIC_KEY : undefined} couponsEnabled={isOrderStoreConfigured()} />
      </div>
    </div>
  );
}
