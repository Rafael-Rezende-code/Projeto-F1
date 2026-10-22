"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { couponFormSchema, couponRow, type CouponForm } from "@/lib/admin/coupon-schema";
import { fieldErrors } from "@/lib/checkout/schema";

export type CouponSaveResult = { ok: true; id: string } | { ok: false; message: string; errors?: Record<string, string> };

// Cupons no painel (operação, fase 1c). Sessão do administrador: o RLS do banco confere de novo (is_admin).
export async function saveCoupon(input: CouponForm): Promise<CouponSaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos destacados.", errors: fieldErrors(parsed.error) };
  const row = couponRow(parsed.data);
  const query = parsed.data.id
    ? supabase.from("coupons").update(row).eq("id", parsed.data.id).select("id").single()
    : supabase.from("coupons").insert(row).select("id").single();
  const { data, error } = await query;
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, message: "Já existe um cupom com este código.", errors: { code: "Código em uso." } };
    return { ok: false, message: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };
  }
  revalidatePath("/admin/cupons");
  return { ok: true, id: data.id as string };
}

export async function setCouponActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível salvar: ${error.message}` };
  revalidatePath("/admin/cupons");
  revalidatePath(`/admin/cupons/${id}`);
  return { ok: true as const };
}
