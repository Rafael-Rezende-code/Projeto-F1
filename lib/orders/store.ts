import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Order, PaymentDetails } from "@/lib/checkout/order";
import { orderFromRow, orderStatusFromPayment, type OrderRow } from "./mapping";
import { lookupFromRow, type OrderLookup } from "./lookup";

// Pedidos gravados no Supabase (fase 9). Só no servidor, com a service role. Usado pelo checkout (server action), pela
// página /pedido/[id] e pelo webhook do Mercado Pago. Sem Supabase configurado, ninguém chama isto (pedidos simulados).

export type NewOrder = {
  id: string;
  customer: { name: string; email: string; phone?: string };
  address: Order["address"];
  shipping: Order["shipping"];
  paymentMethod: Order["payment"]["method"];
  items: { sku: string; quantity: number }[];
  /** Código do cupom (validado e contado pelo banco, dentro da create_order). */
  coupon?: string;
};

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; stockIssues: { sku: string; available: number }[] }
  | { ok: false; couponReason: string }
  | { ok: false; error: string };

const SELECT = "*, order_items(*)";

/** Cria o pedido e baixa o estoque numa transação (função create_order). */
export async function createStoredOrder(input: NewOrder): Promise<CreateOrderResult> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("create_order", {
    p_order: {
      id: input.id,
      customer: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone ?? null },
      address: input.address,
      shipping: input.shipping,
      payment_method: input.paymentMethod,
      items: input.items,
      coupon: input.coupon ?? null,
    },
  });
  if (error) {
    if (error.message.includes("ESTOQUE_INSUFICIENTE")) {
      try {
        return { ok: false, stockIssues: JSON.parse(error.details ?? "[]") };
      } catch {
        return { ok: false, stockIssues: [] };
      }
    }
    if (error.message.includes("CUPOM_INVALIDO")) return { ok: false, couponReason: error.details ?? "inexistente" };
    return { ok: false, error: error.message };
  }
  const order = await getStoredOrder((data as OrderRow).id);
  return order ? { ok: true, order } : { ok: false, error: "Pedido criado, mas não foi possível lê-lo." };
}

export async function getStoredOrder(id: string): Promise<Order | null> {
  const { data } = await createServiceClient().from("orders").select(SELECT).eq("id", id).maybeSingle();
  return data ? orderFromRow(data as OrderRow) : null;
}

/** Pedido para o cliente: só com a chave de acesso certa (o link enviado depois da compra). */
export async function getOrderForCustomer(id: string, token: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await createServiceClient().from("orders").select(SELECT).eq("id", id).eq("access_token", token).maybeSingle();
  return data ? orderFromRow(data as OrderRow) : null;
}

/**
 * Grava o resultado do pagamento e ajusta o status. Recusado ou cancelado devolve o estoque (uma vez só). Não volta um
 * pedido já pago/enviado para trás (notificações fora de ordem).
 */
export async function recordPayment(
  id: string,
  payment: { provider: string; reference: string; providerStatus: string; details?: PaymentDetails & { instructions?: string } },
) {
  const db = createServiceClient();
  const current = await db.from("orders").select("status, payment_details").eq("id", id).maybeSingle();
  if (!current.data) return null;
  const locked = ["pago", "enviado", "entregue"].includes(current.data.status as string);
  const status = locked ? current.data.status : orderStatusFromPayment(payment.providerStatus);
  const { error } = await db
    .from("orders")
    .update({
      status,
      payment_provider: payment.provider,
      payment_reference: payment.reference,
      payment_status: payment.providerStatus,
      payment_details: { ...(current.data.payment_details as object), ...(payment.details ?? {}) },
    })
    .eq("id", id);
  if (error) throw new Error(`Supabase (pagamento): ${error.message}`);
  if (status === "recusado" || status === "cancelado") await releaseStock(id);
  return status;
}

export async function releaseStock(id: string) {
  await createServiceClient().rpc("release_order_stock", { p_order_id: id });
}

export async function cancelStoredOrder(id: string) {
  await createServiceClient().from("orders").update({ status: "cancelado" }).eq("id", id);
  await releaseStock(id);
}

/** Webhook: a notificação já foi processada? (o Mercado Pago reenvia a mesma até receber 200/201) */
export async function hasPaymentEvent(eventId: string) {
  const { data } = await createServiceClient().from("payment_events").select("id").eq("id", eventId).maybeSingle();
  return Boolean(data);
}

/** Webhook: marca a notificação como processada (depois de gravar o pagamento; duplicada é ignorada). */
export async function savePaymentEvent(eventId: string, orderId: string | null, payload: unknown) {
  const { error } = await createServiceClient().from("payment_events").insert({ id: eventId, order_id: orderId, payload });
  if (error && error.code !== "23505") throw new Error(`Supabase (evento): ${error.message}`);
}

/** Consulta por número + e-mail (/pedido/consultar): null para "não existe" E para "e-mail errado". */
export async function lookupStoredOrder(orderId: string, email: string): Promise<OrderLookup | null> {
  const { data, error } = await createServiceClient().rpc("lookup_order", { p_order_id: orderId, p_email: email });
  if (error) throw new Error(`lookup_order: ${error.code}`);
  return lookupFromRow(data);
}
