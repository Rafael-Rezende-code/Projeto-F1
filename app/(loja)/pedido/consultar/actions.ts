"use server";

import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit-config";
import { LOOKUP_NOT_FOUND, normalizeLookupInput, type OrderLookup } from "@/lib/orders/lookup";
import { lookupStoredOrder } from "@/lib/orders/store";
import { isOrderStoreConfigured } from "@/lib/supabase/config";

export type LookupState = { status: "idle" | "found" | "not-found" | "invalid" | "limited" | "error" | "disabled"; message?: string; order?: OrderLookup;
  /** o que foi digitado (o formulário de ação do React se limpa ao enviar) */
  values?: { pedido: string; email: string } };

// Consulta de pedido (operação 1d). Limite por IP ANTES de ir ao banco (lib/rate-limit.ts, balde "consulta-pedido");
// "não existe" e "e-mail não confere" dão a MESMA resposta, pela mesma consulta (lookup_order devolve null nos dois).
export async function lookupOrder(_: LookupState, form: FormData): Promise<LookupState> {
  if (!isOrderStoreConfigured()) return { status: "disabled", values: { pedido: String(form.get("pedido") ?? "").slice(0, 40), email: String(form.get("email") ?? "").slice(0, 254) }, message: "A consulta on-line ainda não está ativa. Fale com a gente pelos canais de contato." };
  const values = { pedido: String(form.get("pedido") ?? "").slice(0, 40), email: String(form.get("email") ?? "").slice(0, 254) };
  const input = normalizeLookupInput(values.pedido, values.email);
  if (!input) return { status: "invalid", values, message: "Informe o número do pedido (ex.: APX-…) e o e-mail usado na compra." };
  if (!(await allowRequest("consulta-pedido"))) return { status: "limited", values, message: RATE_LIMIT_MESSAGE };
  try {
    const order = await lookupStoredOrder(input.orderId, input.email);
    return order ? { status: "found", values, order } : { status: "not-found", values, message: LOOKUP_NOT_FOUND };
  } catch (error) {
    console.error("[consulta] falha:", error instanceof Error ? error.message : "erro"); // sem número nem e-mail no log
    return { status: "error", values, message: "Não foi possível consultar agora. Tente de novo em instantes." };
  }
}
