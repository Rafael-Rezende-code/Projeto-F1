import { MercadoPagoProvider, mercadoPagoConfigured } from "./mercado-pago";
import { SimulatedPaymentProvider } from "./simulated";
import type { PaymentProvider } from "./types";

// Escolha do provedor de pagamento: Mercado Pago quando MP_ACCESS_TOKEN e NEXT_PUBLIC_MP_PUBLIC_KEY existem
// (docs/backend/mercadopago.md); sem elas, o simulado (nada é cobrado). Só no servidor.
export function getPaymentProvider(): PaymentProvider {
  return mercadoPagoConfigured() ? new MercadoPagoProvider() : new SimulatedPaymentProvider();
}

export type * from "./types";
