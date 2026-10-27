"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { dropFormSchema, dropRow, type DropForm } from "@/lib/admin/drop-schema";
import { fieldErrors } from "@/lib/checkout/schema";
import { clearCatalogCache } from "@/lib/catalog/supabase-repository";
import { dropFromRow } from "@/lib/drops";
import { dropWaitlistEmail } from "@/lib/drops-email";
import { clearDropsCache, DROP_COLUMNS } from "@/lib/drops-store";
import { getEmailProvider, isEmailConfigured } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export type DropSaveResult = { ok: true; id: string } | { ok: false; message: string; errors?: Record<string, string> };

// Drops no painel (loja extra, item 6). Sessão do administrador; o RLS do banco confere de novo (is_admin). Salvar
// limpa os caches (drops e catálogo, que leva o selo do drop) e revalida a loja inteira.
const refresh = (id?: string) => {
  clearDropsCache();
  clearCatalogCache();
  revalidatePath("/", "layout");
  revalidatePath("/admin/drops");
  if (id) revalidatePath(`/admin/drops/${id}`);
};

export async function saveDrop(input: DropForm): Promise<DropSaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = dropFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos destacados.", errors: fieldErrors(parsed.error) };
  const row = dropRow(parsed.data);
  const query = parsed.data.id
    ? supabase.from("drops").update(row).eq("id", parsed.data.id).select("id").single()
    : supabase.from("drops").insert(row).select("id").single();
  const { data, error } = await query;
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, message: "Já existe um drop com este endereço.", errors: { slug: "Endereço em uso." } };
    return { ok: false, message: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };
  }
  refresh(data.id as string);
  return { ok: true, id: data.id as string };
}

export async function setDropActive(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("drops").update({ active }).eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível salvar: ${error.message}` };
  refresh(id);
  return { ok: true as const };
}

export async function deleteDrop(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("drops").delete().eq("id", id);
  if (error) return { ok: false as const, message: `Não foi possível apagar: ${error.message}` };
  refresh();
  return { ok: true as const };
}

/**
 * "Avisar lista de espera": um e-mail por pessoa e drop, uma vez só. Cada e-mail é reservado em drop_notifications antes
 * de enviar (chave drop + e-mail): clicar de novo só tenta os que ainda não foram (ou falharam, até 5 tentativas).
 * Desligado sem o Resend (RESEND_API_KEY + EMAIL_FROM).
 */
export async function notifyDropWaitlist(dropId: string) {
  const { supabase } = await requireAdmin();
  if (!isEmailConfigured()) return { ok: false as const, message: "E-mail desligado: configure RESEND_API_KEY e EMAIL_FROM (docs/backend/email.md)." };
  if (!/^[0-9a-f-]{36}$/i.test(dropId)) return { ok: false as const, message: "Drop inválido." };
  const { data: row } = await supabase.from("drops").select(DROP_COLUMNS).eq("id", dropId).maybeSingle();
  if (!row) return { ok: false as const, message: "Drop não encontrado." };
  const drop = dropFromRow(row);
  if (Date.now() < new Date(drop.launchAt).getTime()) return { ok: false as const, message: "O drop ainda não foi lançado: avise depois do lançamento." };
  const [{ data: list }, { data: done }] = await Promise.all([
    supabase.from("drop_waitlist").select("email").eq("drop_id", dropId).limit(5000),
    supabase.from("drop_notifications").select("email, status, attempts").eq("drop_id", dropId).limit(5000),
  ]);
  const state = new Map((done ?? []).map((item: { email: string; status: string; attempts: number }) => [item.email, item]));
  const pending = (list ?? []).map((item: { email: string }) => item.email).filter((email) => {
    const current = state.get(email);
    return !current || (current.status === "falhou" && current.attempts < 5);
  });
  const provider = getEmailProvider();
  const message = dropWaitlistEmail(drop, SITE_URL);
  let sent = 0;
  let failed = 0;
  for (const email of pending) {
    const previous = state.get(email);
    // Reserva (insere só se ainda não existe; quem já está "pendente" em outra execução fica de fora).
    const claim = previous
      ? await supabase.from("drop_notifications").update({ status: "pendente", attempts: previous.attempts + 1, updated_at: new Date().toISOString() }).eq("drop_id", dropId).eq("email", email).eq("status", "falhou").select("email")
      : await supabase.from("drop_notifications").upsert({ drop_id: dropId, email, status: "pendente", attempts: 1 }, { onConflict: "drop_id,email", ignoreDuplicates: true }).select("email");
    if (claim.error || !claim.data?.length) continue;
    const result = await provider.send({ to: email, ...message });
    await supabase.from("drop_notifications").update({ status: result.ok ? "enviado" : "falhou", updated_at: new Date().toISOString() }).eq("drop_id", dropId).eq("email", email);
    if (result.ok) sent++;
    else failed++;
  }
  revalidatePath(`/admin/drops/${dropId}`);
  return { ok: true as const, sent, failed, skipped: (list ?? []).length - pending.length };
}
