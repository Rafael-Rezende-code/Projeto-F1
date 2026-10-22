"use server";

import { z } from "zod";
import { isAdminEmail } from "@/lib/admin/auth";
import { SITE_URL } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

// Envia o link mágico (sem senha). Só para e-mails de ADMIN_EMAILS, e sem criar usuário novo (shouldCreateUser: false:
// os administradores são criados no painel do Supabase). A resposta é a mesma para qualquer e-mail (não revela quem é admin).
export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { status: "error", message: "Informe um e-mail válido." };
  if (isAdminEmail(email.data)) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/admin/entrar/callback` },
    });
    if (error) console.error("[admin] link mágico:", error.message);
  }
  return { status: "sent", message: "Se este e-mail tiver acesso, o link de entrada chega em instantes. Ele vale por 1 hora." };
}
