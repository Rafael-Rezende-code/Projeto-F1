// Ponto de integração de pagamento. Cada provedor (simulado, Mercado Pago, Stripe...) implementa esta interface.
// O checkout (server action) só conversa com getPaymentProvider() de lib/payments/index.ts.
export type PaymentMethod = "pix" | "cartao" | "boleto";

export type PaymentRequest = {
  orderId: string;
  method: PaymentMethod;
  amountCents: number;
  customer: { name: string; email: string; cpf: string };
  description: string;
};

export type PaymentResult =
  | { ok: true; status: "approved" | "pending"; provider: string; reference: string; instructions?: string }
  | { ok: false; message: string };

export interface PaymentProvider {
  readonly name: string;
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
}

/**
 * Dados que o PROVEDOR de pagamento pode devolver para exibir o cartão (ex.: depois de tokenizar no componente dele).
 * PCI: número completo, validade e CVV NUNCA passam pelo nosso formulário nem pelo nosso servidor; só existem dentro do
 * componente do provedor (Card Payment Brick, Payment Element...). Aqui só cabem bandeira e últimos 4 dígitos, para o
 * cartão decorativo do checkout (components/checkout/decorative-card.tsx). No modo simulado, não há nenhum dos dois.
 */
export type CardDisplay = { brand?: string; last4?: string };
