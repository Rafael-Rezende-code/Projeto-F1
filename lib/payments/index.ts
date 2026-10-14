import { SimulatedPaymentProvider } from "./simulated";
import type { PaymentProvider } from "./types";

// Escolha do provedor de pagamento. Hoje só existe o simulado. Para integrar Mercado Pago ou Stripe, ver CLAUDE.md
// ("Pagamento"): criar lib/payments/mercado-pago.ts (ou stripe.ts) implementando PaymentProvider e trocar aqui,
// de preferência por variável de ambiente (PAYMENT_PROVIDER).
export function getPaymentProvider(): PaymentProvider {
  return new SimulatedPaymentProvider();
}

export type * from "./types";
