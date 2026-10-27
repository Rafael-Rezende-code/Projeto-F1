"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { kitFormSchema, kitRow, type KitForm } from "@/lib/admin/kit-schema";
import { fieldErrors } from "@/lib/checkout/schema";
import { clearKitsCache } from "@/lib/kits-store";

export type KitSaveResult = { ok: true; id: string } | { ok: false; message: string; errors?: Record<string, string> };

const refresh = (id?: string) => {
  clearKitsCache();
  revalidatePath("/admin/kits");
  if (id) revalidatePath(`/admin/kits/${id}`);
  revalidatePath("/pilotos/[slug]", "page");
  revalidatePath("/equipes/[slug]", "page");
};

// Kits no painel (loja extra, item 2). Sessão do administrador; o RLS do banco confere de novo (is_admin).
export async function saveKit(input: KitForm): Promise<KitSaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = kitFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos destacados.", errors: fieldErrors(parsed.error) };
  const row = kitRow(parsed.data);
  const { data: found } = await supabase.from("products").select("slug").in("slug", row.product_slugs);
  const missing = row.product_slugs.filter((slug) => !(found ?? []).some((item: { slug: string }) => item.slug === slug));
  if (missing.length) return { ok: false, message: `Peça não encontrada no catálogo: ${missing.join(", ")}.`, errors: { products: "Peça não encontrada." } };
  const query = parsed.data.id
    ? supabase.from("kits").update(row).eq("id", parsed.data.id).select("id").single()
    : supabase.from("kits").insert(row).select("id").single();
  const { data, error } = await query;
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, message: "Já existe um kit com este endereço.", errors: { slug: "Endereço em uso." } };
    return { ok: false, message: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };
  }
  refresh(data.id as string);
  return { ok: true, id: data.id as string };
}

export async function setKitActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("kits").update({ active }).eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível salvar: ${error.message}` };
  refresh(id);
  return { ok: true as const };
}

export async function deleteKit(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("kits").delete().eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível apagar: ${error.message}` };
  refresh();
  return { ok: true as const };
}
