import "server-only";
import { after } from "next/server";
import { company } from "@/lib/company";
import { orderFromRow, type OrderRow } from "@/lib/orders/mapping";
import { SITE_URL } from "@/lib/site";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { getEmailProvider } from "./index";
import { orderEmail } from "./templates";
import type { OrderEmailType } from "./types";

// Envio dos e-mails do pedido (operação, fase 3). Idempotente pelo banco (email_log: um por pedido + tipo, via
// claim_order_email). Só pedidos GRAVADOS (modo simulado não manda e-mail). Nunca lança: falha vira "falhou" no registro
// e uma linha no log, sem o endereço e sem o conteúdo.
export async function sendOrderEmail(orderId: string, type: OrderEmailType): Promise<"enviado" | "ignorado" | "falhou"> {
  if (!isOrderStoreConfigured()) return "ignorado";
  const db = createServiceClient();
  try {
    const { data: claimed, error: claimError } = await db.rpc("claim_order_email", { p_order_id: orderId, p_type: type });
    if (claimError || !claimed) return "ignorado";
    const { data } = await db.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
    if (!data) {
      await db.rpc("finish_order_email", { p_order_id: orderId, p_type: type, p_ok: false, p_provider: null, p_provider_id: null, p_error: "pedido não encontrado" });
      return "falhou";
    }
    const order = orderFromRow(data as OrderRow);
    const provider = getEmailProvider();
    const message = orderEmail(type, order, SITE_URL);
    const result = await provider.send({ to: order.customer.email, ...message, ...(company.email ? { replyTo: company.email } : {}) });
    await db.rpc("finish_order_email", {
      p_order_id: orderId,
      p_type: type,
      p_ok: result.ok,
      p_provider: provider.name,
      p_provider_id: result.ok ? (result.id ?? null) : null,
      p_error: result.ok ? null : result.error,
    });
    if (!result.ok) console.error(`[e-mail] ${type} do pedido ${orderId} falhou: ${result.error}`);
    return result.ok ? "enviado" : "falhou";
  } catch (error) {
    console.error(`[e-mail] ${type} do pedido ${orderId}:`, error instanceof Error ? error.message : "erro");
    return "falhou";
  }
}

/** Agenda os envios para depois da resposta (after); fora de uma requisição, envia na hora. */
export function queueOrderEmails(orderId: string, types: OrderEmailType[]) {
  if (!types.length) return;
  const run = async () => {
    for (const type of types) await sendOrderEmail(orderId, type);
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
