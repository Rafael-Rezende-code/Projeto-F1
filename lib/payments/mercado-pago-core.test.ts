import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildPaymentBody, handleWebhook, methodFromBrick, parseSignatureHeader, readPayment, signatureManifest, verifySignature, type MpPayment, type WebhookDeps } from "./mercado-pago-core";

const SECRET = "segredo-de-teste";
const sign = (dataId: string | null, requestId: string | null, ts: string, secret = SECRET) =>
  `ts=${ts},v1=${createHmac("sha256", secret).update(signatureManifest(dataId, requestId, ts)).digest("hex")}`;

const NOW = 1_792_670_000_000; // ms
const TS = String(NOW / 1000); // segundos, como o Mercado Pago envia

function notification({ dataId = "123456", type = "payment", signature, requestId = "req-1", id = 999 }: { dataId?: string; type?: string; signature?: string; requestId?: string; id?: number } = {}) {
  const headers = new Map([
    ["x-signature", signature ?? sign(dataId, requestId, TS)],
    ["x-request-id", requestId],
  ]);
  return {
    searchParams: new URLSearchParams({ "data.id": dataId, type }),
    headers: { get: (name: string) => headers.get(name) ?? null },
    body: { id, type, action: "payment.updated", data: { id: dataId } },
  };
}

const approvedCard: MpPayment = { id: 123456, status: "approved", status_detail: "accredited", external_reference: "APX-1", payment_method_id: "visa", payment_type_id: "credit_card", installments: 3, card: { last_four_digits: "4242" } };

function deps(overrides: Partial<WebhookDeps> = {}) {
  const seen = new Set<string>();
  const base: WebhookDeps = {
    secret: SECRET,
    now: NOW,
    fetchPayment: vi.fn(async () => approvedCard),
    hasEvent: vi.fn(async (id: string) => seen.has(id)),
    saveEvent: vi.fn(async (id: string) => void seen.add(id)),
    recordPayment: vi.fn(async () => "pago"),
  };
  return { ...base, ...overrides };
}

describe("assinatura do webhook", () => {
  it("lê o cabeçalho x-signature", () => {
    expect(parseSignatureHeader("ts=1704908010,v1=abc123")).toEqual({ ts: "1704908010", v1: "abc123" });
    expect(parseSignatureHeader("v1=abc")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("monta o manifesto da documentação (id em minúsculas; partes ausentes saem)", () => {
    expect(signatureManifest("ABC", "req", "1")).toBe("id:abc;request-id:req;ts:1;");
    expect(signatureManifest(null, "req", "1")).toBe("request-id:req;ts:1;");
  });

  it("aceita a assinatura certa e recusa adulterada, de outra chave ou velha", () => {
    const header = sign("123", "req", TS);
    expect(verifySignature({ header, requestId: "req", dataId: "123", secret: SECRET, now: NOW, toleranceMs: 60_000 })).toBe(true);
    expect(verifySignature({ header, requestId: "req", dataId: "124", secret: SECRET })).toBe(false);
    expect(verifySignature({ header, requestId: "outro", dataId: "123", secret: SECRET })).toBe(false);
    expect(verifySignature({ header: sign("123", "req", TS, "outra"), requestId: "req", dataId: "123", secret: SECRET })).toBe(false);
    expect(verifySignature({ header, requestId: "req", dataId: "123", secret: SECRET, now: NOW + 60 * 60_000, toleranceMs: 15 * 60_000 })).toBe(false);
    expect(verifySignature({ header: "ts=1,v1=zz", requestId: "req", dataId: "123", secret: SECRET })).toBe(false);
  });
});

describe("handleWebhook", () => {
  it("assinatura inválida → 401, sem buscar nem gravar nada", async () => {
    const d = deps();
    const result = await handleWebhook(notification({ signature: sign("123456", "req-1", TS, "errada") }), d);
    expect(result.status).toBe(401);
    expect(d.fetchPayment).not.toHaveBeenCalled();
    expect(d.recordPayment).not.toHaveBeenCalled();
  });

  it("pagamento aprovado: busca na API e grava no pedido da external_reference", async () => {
    const d = deps();
    const result = await handleWebhook(notification(), d);
    expect(result.status).toBe(200);
    expect(d.fetchPayment).toHaveBeenCalledWith("123456");
    expect(d.recordPayment).toHaveBeenCalledWith("APX-1", expect.objectContaining({ status: "approved", providerStatus: "approved", reference: "123456" }));
    expect(d.saveEvent).toHaveBeenCalledTimes(1);
  });

  it("idempotente: a mesma notificação de novo não grava outra vez", async () => {
    const d = deps();
    await handleWebhook(notification(), d);
    const again = await handleWebhook(notification(), d);
    expect(again.status).toBe(200);
    expect(again.body.note).toBe("já processado");
    expect(d.recordPayment).toHaveBeenCalledTimes(1);
    expect(d.fetchPayment).toHaveBeenCalledTimes(1);
  });

  it("outros tipos de notificação são ignorados com 200", async () => {
    const d = deps();
    const result = await handleWebhook(notification({ type: "merchant_order" }), d);
    expect(result.status).toBe(200);
    expect(d.fetchPayment).not.toHaveBeenCalled();
  });

  it("pagamento que a API não encontra → 500 (o Mercado Pago tenta de novo) e nada é marcado como processado", async () => {
    const d = deps({ fetchPayment: vi.fn(async () => null) });
    const result = await handleWebhook(notification(), d);
    expect(result.status).toBe(500);
    expect(d.saveEvent).not.toHaveBeenCalled();
  });

  it("erro ao gravar não marca a notificação como processada (a próxima tentativa grava)", async () => {
    const d = deps({ recordPayment: vi.fn(async () => Promise.reject(new Error("banco fora"))) });
    await expect(handleWebhook(notification(), d)).rejects.toThrow("banco fora");
    expect(d.saveEvent).not.toHaveBeenCalled();
  });
});

describe("pagamento", () => {
  it("lê Pix, boleto e cartão para a página de status", () => {
    const pix = readPayment({ id: 1, status: "pending", payment_type_id: "bank_transfer", payment_method_id: "pix", date_of_expiration: "2026-10-23T12:00:00Z", point_of_interaction: { transaction_data: { qr_code: "000201", qr_code_base64: "iVBOR", ticket_url: "https://mp/t" } } });
    expect(pix.status).toBe("pending");
    expect(pix.details.pix).toEqual({ qrCode: "000201", qrCodeBase64: "iVBOR", ticketUrl: "https://mp/t", expiresAt: "2026-10-23T12:00:00Z" });
    const boleto = readPayment({ id: 2, status: "pending", payment_type_id: "ticket", transaction_details: { external_resource_url: "https://mp/boleto" }, barcode: { content: "2379..." } });
    expect(boleto.details.boleto).toMatchObject({ url: "https://mp/boleto", barcode: "2379..." });
    const card = readPayment(approvedCard);
    expect(card).toMatchObject({ status: "approved", details: { card: { brand: "visa", last4: "4242", installments: 3 } } });
    expect(readPayment({ ...approvedCard, status: "rejected", status_detail: "cc_rejected_other_reason" }).status).toBe("rejected");
    expect(readPayment({ ...approvedCard, status: "in_process" }).status).toBe("pending");
  });

  it("o valor cobrado é o do servidor; cartão leva token e parcelas; boleto leva endereço", () => {
    const customer = { name: "Maria da Silva", email: "maria@x.com", address: { street: "Rua A", number: "10", district: "Centro", city: "São Paulo", state: "SP", cep: "01000-000" } };
    const card = buildPaymentBody({ orderId: "APX-1", method: "cartao", amountCents: 12345, description: "Pedido", customer, form: { payment_method_id: "visa", token: "tok", installments: 3, issuer_id: "25" } });
    expect(card).toMatchObject({ transaction_amount: 123.45, external_reference: "APX-1", token: "tok", installments: 3, issuer_id: 25, payer: { email: "maria@x.com", first_name: "Maria", last_name: "da Silva" } });
    const boleto = buildPaymentBody({ orderId: "APX-2", method: "boleto", amountCents: 5000, description: "Pedido", customer, form: { payment_method_id: "bolbradesco", payer: { identification: { type: "CPF", number: "12345678909" } } } });
    expect(boleto).toMatchObject({ transaction_amount: 50, payment_method_id: "bolbradesco", payer: { identification: { type: "CPF", number: "12345678909" }, address: { zip_code: "01000000", federal_unit: "SP", street_number: "10" } } });
    expect(boleto).not.toHaveProperty("token");
  });

  it("meios do Brick → meios do pedido", () => {
    expect(methodFromBrick("creditCard")).toBe("cartao");
    expect(methodFromBrick("bank_transfer")).toBe("pix");
    expect(methodFromBrick("ticket")).toBe("boleto");
    expect(methodFromBrick("wallet_purchase")).toBeNull();
  });
});
