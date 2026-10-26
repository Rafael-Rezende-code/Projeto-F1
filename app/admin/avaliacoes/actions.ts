"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";

// Moderação de avaliações (refino 3, item 2.5). Só administrador (requireAdmin e, no banco, o RLS is_admin()). Aprovar
// publica na página do produto (revalidada aqui); rejeitar esconde. Quem e quando ficam registrados pelo gatilho.
export async function moderateReview(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decisao") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["aprovada", "rejeitada", "pendente"].includes(decision)) return;
  const { data } = await supabase.from("reviews").update({ status: decision }).eq("id", id).select("product_slug").maybeSingle();
  if (data?.product_slug) revalidatePath(`/produtos/${data.product_slug}`);
  revalidatePath("/admin/avaliacoes");
}
