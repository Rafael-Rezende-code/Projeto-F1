import type { PaymentDetails } from "@/lib/checkout/order";

// Ponto de integração de pagamento. Cada provedor (simulado, Mercado Pago, Stripe...) implementa esta interface.
// O checkout (server action) só conversa com getPaymentProvider() de lib/payments/index.ts.
export type PaymentMethod = "pix" | "cartao" | "boleto";

export type PaymentRequest = {
  orderId: string;
  method: PaymentMethod;
  amountCents: number;
  /**
   * CPF: hoje só o BOLETO pede (boleto registrado exige o CPF do pagador; ver CPF_REQUIRED_METHODS em
   * lib/checkout/schema.ts). Pix e cartão não pedem CPF no nosso checkout.
   * O provedor real pode exigir CPF em outros meios (ex.: antifraude do cartão no Mercado Pago, ou Pix com
   * identificação do pagador). Nesse caso, acrescente o meio em CPF_REQUIRED_METHODS: o campo passa a aparecer SÓ para
   * o meio que exigir (na etapa de pagamento), com máscara e validação, e a action envia o CPF aqui.
   */
  customer: { name: string; email: string; cpf?: string; address?: import("@/lib/checkout/order").Order["address"] };
  description: string;
  /**
   * Dados do componente do provedor (Mercado Pago: o formData do Payment Brick, com o TOKEN do cartão, nunca o
   * número). Validado pelo próprio provedor. O simulado ignora.
   */
  providerData?: unknown;
};

export type PaymentResult =
  | {
      ok: true;
      /** approved: pago · pending: Pix/boleto em aberto ou cartão em análise · rejected: recusado pelo emissor */
      status: "approved" | "pending" | "rejected";
      provider: string;
      reference: string;
      /** Status bruto do provedor (ex.: in_process), gravado no pedido. */
      providerStatus?: string;
      instructions?: string;
      /** QR do Pix, link do boleto, bandeira e últimos 4 dígitos do cartão (página de status). */
      details?: PaymentDetails;
    }
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
