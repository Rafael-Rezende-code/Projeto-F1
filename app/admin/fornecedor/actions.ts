"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";

export type SupplierState = { ok?: boolean; message?: string };

// Fila do fornecedor: marca o item como COMPRADO (com o rastreio do fornecedor, opcional) ou só atualiza o rastreio.
// Compra manual: esta ação apenas registra o que a pessoa fez no site do fornecedor.
export async function markPurchased(_: SupplierState, form: FormData): Promise<SupplierState> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({ itemId: z.string().uuid(), tracking: z.string().trim().max(60), intent: z.enum(["comprar", "rastreio"]) })
    .safeParse({ itemId: form.get("itemId"), tracking: form.get("tracking") ?? "", intent: form.get("intent") });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const { itemId, tracking, intent } = parsed.data;
  const patch =
    intent === "comprar"
      ? { item_status: "comprado", purchased_at: new Date().toISOString(), supplier_tracking_code: tracking ? tracking.toUpperCase() : null }
      : { supplier_tracking_code: tracking ? tracking.toUpperCase() : null };
  const { data, error } = await supabase
    .from("order_items")
    .update(patch)
    .eq("id", itemId)
    .eq("fulfillment", "sob_encomenda")
    .in("item_status", intent === "comprar" ? ["aguardando-compra"] : ["aguardando-compra", "comprado"])
    .select("order_id");
  if (error) return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  if (!data?.length) return { ok: false, message: "Item não encontrado ou já atualizado." };
  revalidatePath("/admin/fornecedor");
  revalidatePath(`/admin/pedidos/${data[0].order_id}`);
  return { ok: true, message: intent === "comprar" ? "Marcado como comprado." : "Rastreio do fornecedor salvo." };
}
