import "server-only";
import { SITE_URL } from "@/lib/site";
import { brickFormDataSchema, buildPaymentBody, readPayment, rejectionMessage, type MpPayment } from "./mercado-pago-core";
import type { PaymentProvider, PaymentRequest, PaymentResult } from "./types";

// Mercado Pago (fase 10, Checkout Bricks). Ligado quando MP_ACCESS_TOKEN e NEXT_PUBLIC_MP_PUBLIC_KEY existem
// (lib/payments/index.ts). O navegador mostra o Payment Brick oficial (components/checkout/mercado-pago-brick.tsx):
// dados do cartão só existem no componente do Mercado Pago, que devolve um TOKEN. Aqui o servidor cria o pagamento
// com o valor calculado no servidor. Passo a passo em docs/backend/mercadopago.md.
const API = "https://api.mercadopago.com/v1/payments";

export const mercadoPagoConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY);

async function call(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
}

/** Busca o pagamento (o webhook só traz o id: o status vem sempre da API, nunca do corpo da notificação). */
export async function fetchMercadoPagoPayment(id: string): Promise<MpPayment | null> {
  const response = await call(`${API}/${encodeURIComponent(id)}`);
  if (!response.ok) return null;
  return (await response.json()) as MpPayment;
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago";

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    const form = brickFormDataSchema.safeParse(request.providerData);
    if (!form.success) return { ok: false, message: "Não recebemos os dados do pagamento. Preencha de novo." };
    if (request.method === "cartao" && !form.data.token) return { ok: false, message: "Não foi possível validar o cartão. Preencha de novo." };

    // Webhook só em URL pública https (localhost não recebe notificação).
    const notificationUrl = SITE_URL.startsWith("https://") ? `${SITE_URL}/api/webhooks/mercadopago` : undefined;
    const body = buildPaymentBody({
      orderId: request.orderId,
      method: request.method,
      amountCents: request.amountCents,
      description: request.description,
      notificationUrl,
      customer: request.customer,
      form: form.data,
    });
    try {
      // Idempotência por pedido: repetir a chamada não cria um segundo pagamento.
      const response = await call(API, { method: "POST", body: JSON.stringify(body), headers: { "X-Idempotency-Key": `pedido-${request.orderId}` } });
      const json = (await response.json()) as MpPayment & { message?: string };
      if (!response.ok) {
        console.error("[mercadopago] erro ao criar pagamento:", response.status, json.message);
        return { ok: false, message: "O Mercado Pago não aceitou o pagamento agora. Confira os dados e tente de novo." };
      }
      const result = readPayment(json);
      return {
        ok: true,
        status: result.status,
        provider: this.name,
        reference: result.reference,
        providerStatus: result.providerStatus,
        details: result.details,
        instructions: result.status === "rejected" ? rejectionMessage(json.status_detail) : undefined,
      };
    } catch (error) {
      console.error("[mercadopago] falha de rede:", error);
      return { ok: false, message: "Não conseguimos falar com o Mercado Pago. Tente de novo em instantes." };
    }
  }
}
