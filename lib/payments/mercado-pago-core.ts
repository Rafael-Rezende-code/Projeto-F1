import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Order, PaymentDetails } from "@/lib/checkout/order";

// Mercado Pago, parte PURA (sem rede, com testes em mercado-pago-core.test.ts): validação do formData do Payment Brick,
// montagem do corpo do pagamento, leitura da resposta e validação da assinatura do webhook.
// Referências (out/2026): POST /v1/payments (Checkout Bricks → Payment Brick → envio do pagamento) e Notificações →
// Webhooks (x-signature "ts=...,v1=..."; manifesto "id:[data.id];request-id:[x-request-id];ts:[ts];" em HMAC-SHA256).

const identification = z.object({ type: z.string().min(1), number: z.string().min(1) });

/** formData do Payment Brick (só o que usamos). Cartão vem TOKENIZADO: número, validade e CVV nunca chegam aqui. */
export const brickFormDataSchema = z.object({
  payment_method_id: z.string().min(1),
  token: z.string().min(1).optional(),
  issuer_id: z.union([z.string(), z.number()]).optional(),
  installments: z.number().int().min(1).max(24).optional(),
  payer: z
    .object({
      email: z.string().optional(),
      identification: identification.optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      address: z
        .object({
          zip_code: z.string().optional(),
          federal_unit: z.string().optional(),
          city: z.string().optional(),
          neighborhood: z.string().optional(),
          street_name: z.string().optional(),
          street_number: z.union([z.string(), z.number()]).optional(),
        })
        .optional(),
    })
    .optional(),
});
export type BrickFormData = z.infer<typeof brickFormDataSchema>;

export { methodFromBrick } from "./brick";

type PaymentInput = {
  orderId: string;
  method: Order["payment"]["method"];
  amountCents: number;
  description: string;
  notificationUrl?: string;
  customer: { name: string; email: string; address?: Order["address"] };
  form: BrickFormData;
};

/** Corpo do POST /v1/payments. O valor é SEMPRE o do servidor (nunca o transaction_amount do navegador). */
export function buildPaymentBody({ orderId, method, amountCents, description, notificationUrl, customer, form }: PaymentInput) {
  const [firstName, ...rest] = customer.name.trim().split(/\s+/);
  const payer: Record<string, unknown> = {
    email: customer.email,
    first_name: form.payer?.first_name || firstName,
    last_name: form.payer?.last_name || rest.join(" ") || firstName,
  };
  if (form.payer?.identification) payer.identification = form.payer.identification;
  if (method === "boleto") {
    // Boleto registrado: endereço do pagador (o que o Brick coletou ou, na falta, o endereço de entrega).
    const a = form.payer?.address;
    const ship = customer.address;
    payer.address = {
      zip_code: (a?.zip_code ?? ship?.cep ?? "").replace(/\D/g, ""),
      federal_unit: a?.federal_unit ?? ship?.state,
      city: a?.city ?? ship?.city,
      neighborhood: a?.neighborhood ?? ship?.district,
      street_name: a?.street_name ?? ship?.street,
      street_number: String(a?.street_number ?? ship?.number ?? "S/N"),
    };
  }
  const body: Record<string, unknown> = {
    transaction_amount: Math.round(amountCents) / 100,
    description,
    external_reference: orderId,
    payment_method_id: form.payment_method_id,
    payer,
  };
  if (notificationUrl) body.notification_url = notificationUrl;
  if (method === "cartao") {
    body.token = form.token;
    body.installments = form.installments ?? 1;
    if (form.issuer_id !== undefined) body.issuer_id = Number(form.issuer_id);
  }
  return body;
}

/** Resposta do Mercado Pago (GET/POST /v1/payments) — só os campos usados. */
export type MpPayment = {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  payment_method_id?: string;
  payment_type_id?: string;
  installments?: number;
  date_of_expiration?: string | null;
  card?: { last_four_digits?: string | null } | null;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } } | null;
  transaction_details?: { external_resource_url?: string | null } | null;
  barcode?: { content?: string } | null;
};

/** Resposta → status (approved / pending / rejected) e detalhes para a página do pedido. */
export function readPayment(payment: MpPayment): { status: "approved" | "pending" | "rejected"; providerStatus: string; reference: string; details: PaymentDetails } {
  const details: PaymentDetails = {};
  const pix = payment.point_of_interaction?.transaction_data;
  if (pix?.qr_code) details.pix = { qrCode: pix.qr_code, qrCodeBase64: pix.qr_code_base64, ticketUrl: pix.ticket_url, expiresAt: payment.date_of_expiration ?? undefined };
  if (payment.payment_type_id === "ticket" && payment.transaction_details?.external_resource_url)
    details.boleto = { url: payment.transaction_details.external_resource_url, barcode: payment.barcode?.content, expiresAt: payment.date_of_expiration ?? undefined };
  if (payment.payment_type_id === "credit_card" || payment.payment_type_id === "debit_card")
    details.card = { brand: payment.payment_method_id, last4: payment.card?.last_four_digits ?? undefined, installments: payment.installments };
  if (payment.status_detail) details.statusDetail = payment.status_detail;
  const status = payment.status === "approved" ? "approved" : payment.status === "rejected" || payment.status === "cancelled" ? "rejected" : "pending";
  return { status, providerStatus: payment.status, reference: String(payment.id), details };
}

/** Mensagem curta para recusas comuns do cartão (status_detail do Mercado Pago). */
export function rejectionMessage(statusDetail?: string) {
  switch (statusDetail) {
    case "cc_rejected_insufficient_amount":
      return "O cartão não tem limite suficiente.";
    case "cc_rejected_bad_filled_security_code":
    case "cc_rejected_bad_filled_date":
    case "cc_rejected_bad_filled_other":
      return "Algum dado do cartão não confere. Revise e tente de novo.";
    case "cc_rejected_call_for_authorize":
      return "O emissor pede autorização: ligue para o banco e tente de novo.";
    default:
      return "O pagamento não foi aprovado. Tente outro cartão ou outra forma de pagamento.";
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Webhook

/** "ts=1704908010,v1=abc..." → { ts, v1 } */
export function parseSignatureHeader(header: string | null) {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(",")) {
    const [key, value] = part.split("=").map((item) => item?.trim());
    if (key && value) out[key] = value;
  }
  return out.ts && out.v1 ? { ts: out.ts, v1: out.v1 } : null;
}

/** Manifesto assinado pelo Mercado Pago. Partes ausentes na notificação ficam de fora (regra da documentação). */
export function signatureManifest(dataId: string | null, requestId: string | null, ts: string) {
  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

/**
 * Confere a assinatura (HMAC-SHA256 hex do manifesto com a chave secreta do webhook), em tempo constante.
 * `toleranceMs` recusa notificações velhas demais (replay); 0 desliga a checagem de tempo.
 */
export function verifySignature(input: { header: string | null; requestId: string | null; dataId: string | null; secret: string; now?: number; toleranceMs?: number }) {
  const parsed = parseSignatureHeader(input.header);
  if (!parsed || !input.secret) return false;
  const expected = createHmac("sha256", input.secret).update(signatureManifest(input.dataId, input.requestId, parsed.ts)).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const tolerance = input.toleranceMs ?? 0;
  if (tolerance > 0) {
    const tsMs = parsed.ts.length > 10 ? Number(parsed.ts) : Number(parsed.ts) * 1000; // segundos ou ms
    if (!Number.isFinite(tsMs) || Math.abs((input.now ?? Date.now()) - tsMs) > tolerance) return false;
  }
  return true;
}

export type WebhookDeps = {
  secret: string;
  fetchPayment: (id: string) => Promise<MpPayment | null>;
  hasEvent: (eventId: string) => Promise<boolean>;
  saveEvent: (eventId: string, orderId: string | null, payload: unknown) => Promise<void>;
  /** Grava o pagamento no pedido (null se o pedido não existe ou não há banco). */
  recordPayment: (orderId: string, payment: ReturnType<typeof readPayment>) => Promise<unknown>;
  now?: number;
};

/**
 * Trata uma notificação do Mercado Pago. Idempotente: a mesma notificação (id) processada duas vezes não grava de
 * novo; e mesmo que grave, recordPayment não volta um pedido pago para trás nem devolve estoque duas vezes.
 * Responde 200 rápido para o que não interessa (outros tipos), 401 para assinatura inválida, 500 para erro temporário
 * (o Mercado Pago tenta de novo).
 */
export async function handleWebhook(
  request: { searchParams: URLSearchParams; headers: { get(name: string): string | null }; body: unknown },
  deps: WebhookDeps,
): Promise<{ status: number; body: { ok: boolean; note?: string } }> {
  const body = (request.body ?? {}) as { id?: number | string; type?: string; action?: string; data?: { id?: string | number } };
  const dataId = request.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
  const type = request.searchParams.get("type") ?? body.type ?? null;
  if (!verifySignature({ header: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId, secret: deps.secret, now: deps.now, toleranceMs: 15 * 60_000 }))
    return { status: 401, body: { ok: false, note: "assinatura inválida" } };
  if (type !== "payment" || !dataId) return { status: 200, body: { ok: true, note: "ignorado" } };

  const eventId = `mp:${body.id ?? dataId}:${body.action ?? "payment"}`;
  if (await deps.hasEvent(eventId)) return { status: 200, body: { ok: true, note: "já processado" } };

  const payment = await deps.fetchPayment(dataId);
  if (!payment) return { status: 500, body: { ok: false, note: "pagamento não encontrado" } };
  const orderId = payment.external_reference ?? null;
  if (orderId) await deps.recordPayment(orderId, readPayment(payment));
  await deps.saveEvent(eventId, orderId, body);
  return { status: 200, body: { ok: true } };
}
