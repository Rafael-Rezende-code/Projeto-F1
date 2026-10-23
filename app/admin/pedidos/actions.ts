"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { orderActionMessage } from "@/lib/admin/order-actions";

export type ShipState = { ok?: boolean; message?: string };

// Marca o pedido como enviado, com o código de rastreio. Só pedidos pagos (ou já enviados, para corrigir o código).
export async function markShipped(_: ShipState, form: FormData): Promise<ShipState> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({ id: z.string().min(3), tracking: z.string().trim().min(5, "Informe o código de rastreio.").max(60) })
    .safeParse({ id: form.get("id"), tracking: form.get("tracking") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "enviado", tracking_code: parsed.data.tracking.toUpperCase(), shipped_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .in("status", ["pago", "enviado"])
    .select("id");
  if (error) return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  if (!data?.length) return { ok: false, message: "Só pedidos pagos podem ser marcados como enviados." };
  // Itens (refino 2): os que ainda não foram enviados passam a "enviado" com o mesmo rastreio. Item sob encomenda ainda
  // não comprado fica como está (o aviso aparece no detalhe do pedido).
  await supabase
    .from("order_items")
    .update({ item_status: "enviado", tracking_code: parsed.data.tracking.toUpperCase(), shipped_at: new Date().toISOString() })
    .eq("order_id", parsed.data.id)
    .in("item_status", ["separando", "comprado", "enviado"]);
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Pedido marcado como enviado." };
}

export type OrderActionState = { ok?: boolean; message?: string };

const idSchema = z.string().min(3).max(60);

const refresh = (id: string) => {
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
};

// Cancelamento (operação, fase 2): tudo na função cancel_order do banco (status, estoque, uso do cupom e histórico numa
// transação). Pedido enviado/entregue exige a caixa de confirmação. Não estorna no provedor: o reembolso é registrado à
// parte (markRefunded), depois de feito no painel do Mercado Pago.
export async function cancelOrder(_: OrderActionState, form: FormData): Promise<OrderActionState> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({ id: idSchema, reason: z.string().trim().min(3, "Escreva o motivo do cancelamento.").max(500), confirmShipped: z.boolean() })
    .safeParse({ id: form.get("id"), reason: form.get("reason"), confirmShipped: form.get("confirmShipped") === "on" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { error } = await supabase.rpc("cancel_order", { p_order_id: parsed.data.id, p_reason: parsed.data.reason, p_confirm_shipped: parsed.data.confirmShipped });
  if (error) return { ok: false, message: orderActionMessage(error) };
  refresh(parsed.data.id);
  return { ok: true, message: "Pedido cancelado. Estoque e cupom devolvidos." };
}

export async function markRefunded(_: OrderActionState, form: FormData): Promise<OrderActionState> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({ id: idSchema, note: z.string().trim().min(3, "Descreva o reembolso.").max(500) })
    .safeParse({ id: form.get("id"), note: form.get("note") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { error } = await supabase.rpc("mark_order_refunded", { p_order_id: parsed.data.id, p_note: parsed.data.note });
  if (error) return { ok: false, message: orderActionMessage(error) };
  refresh(parsed.data.id);
  return { ok: true, message: "Reembolso registrado." };
}

/** Marca/desmarca pedido de teste (fica fora dos indicadores; o gatilho registra no histórico). */
export async function setOrderTest(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return;
  await supabase.from("orders").update({ is_test: form.get("isTest") === "true" }).eq("id", id.data);
  refresh(id.data);
}
