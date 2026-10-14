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
