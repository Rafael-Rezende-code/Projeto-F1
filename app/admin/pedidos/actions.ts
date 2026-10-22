"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

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
