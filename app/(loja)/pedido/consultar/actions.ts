"use server";

import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit-config";
import { LOOKUP_NOT_FOUND, normalizeLookupInput, type OrderLookup } from "@/lib/orders/lookup";
import { lookupStoredOrder } from "@/lib/orders/store";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { REVIEW_RESULT_MESSAGES, REVIEWS_ENABLED, validateReview } from "@/lib/reviews";
import { reviewedProducts, submitStoredReview } from "@/lib/reviews-store";

export type LookupState = { status: "idle" | "found" | "not-found" | "invalid" | "limited" | "error" | "disabled"; message?: string; order?: OrderLookup;
  /** o que foi digitado (o formulário de ação do React se limpa ao enviar) */
  values?: { pedido: string; email: string };
  /** Avaliações (refino 3): ligadas e pedido entregue; produtos que já foram avaliados. */
  reviews?: { enabled: boolean; reviewed: string[] } };

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
    if (!order) return { status: "not-found", values, message: LOOKUP_NOT_FOUND };
    const reviewsOpen = REVIEWS_ENABLED && order.status === "entregue";
    return { status: "found", values, order, reviews: { enabled: reviewsOpen, reviewed: reviewsOpen ? await reviewedProducts(input.orderId, input.email) : [] } };
  } catch (error) {
    console.error("[consulta] falha:", error instanceof Error ? error.message : "erro"); // sem número nem e-mail no log
    return { status: "error", values, message: "Não foi possível consultar agora. Tente de novo em instantes." };
  }
}

export type ReviewState = { status: "idle" | "ok" | "error"; message?: string };

// Avaliação de um produto do pedido (refino 3, item 2.5). Só com NEXT_PUBLIC_REVIEWS_ENABLED e pedidos gravados. O pedido
// e o e-mail vêm da consulta (campos ocultos) e são conferidos DE NOVO no banco (submit_review: pedido + e-mail +
// entregue + produto do pedido; grava como pendente). Limite por IP antes de ir ao banco. Nada do texto vai para o log.
export async function submitReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  if (!REVIEWS_ENABLED || !isOrderStoreConfigured()) return { status: "error", message: "As avaliações ainda não estão abertas." };
  const input = normalizeLookupInput(form.get("pedido"), form.get("email"));
  if (!input) return { status: "error", message: "Consulte o pedido de novo para avaliar." };
  const check = validateReview(form);
  if (!check.ok) return { status: "error", message: check.message };
  if (!(await allowRequest("avaliacao"))) return { status: "error", message: RATE_LIMIT_MESSAGE };
  try {
    const result = await submitStoredReview({ orderId: input.orderId, email: input.email, ...check.value });
    return { status: result === "ok" ? "ok" : "error", message: REVIEW_RESULT_MESSAGES[result] ?? "Não foi possível enviar agora." };
  } catch (error) {
    console.error("[avaliacao] falha:", error instanceof Error ? error.message : "erro");
    return { status: "error", message: "Não foi possível enviar agora. Tente de novo em instantes." };
  }
}
