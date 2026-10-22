import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/session";

/** Painel desligado (sem Supabase): as páginas não renderizam nada e o layout explica como ativar. */
export const adminDisabled = () => !isSupabaseConfigured();

// Quem pode entrar no painel: e-mails em ADMIN_EMAILS (variável de ambiente, separados por vírgula). O banco confere
// de novo pela tabela admin_emails (RLS): as duas listas precisam ter os mesmos e-mails (docs/backend/admin.md).
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const isAdminEmail = (email?: string | null) => Boolean(email && adminEmails().includes(email.toLowerCase()));

/** Exige um administrador logado (senão, vai para /admin/entrar). Devolve o cliente com a sessão. */
export async function requireAdmin() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !isAdminEmail(data.user.email)) redirect("/admin/entrar");
  return { supabase, user: data.user };
}
