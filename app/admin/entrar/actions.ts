"use server";

import { redirect } from "next/navigation";
import { attemptLogin, type LoginDeps } from "@/lib/admin/login";
import { isAdminEmail } from "@/lib/admin/auth";
import { allowRequest, emailKey, recordHit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/session";

export type LoginState = { status: "idle" | "error"; message?: string };

// Entrar no painel com e-mail e senha (Supabase Auth, sessão nos cookies do @supabase/ssr). A senha só passa por aqui:
// nada dela vai para log, URL ou mensagem (os logs registram só o código do erro).
export async function loginWithPassword(_: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { status: "error", message: "Painel desligado: configure o Supabase." };
  const supabase = await createSessionClient();
  const deps: LoginDeps = {
    allow: (bucket, key) => allowRequest(bucket, key === undefined ? undefined : emailKey(key)),
    recordFailure: (email) => recordHit("admin-login-falha", emailKey(email)),
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("[admin] login recusado:", error.code ?? error.status);
        return null;
      }
      return data.user?.email ?? null;
    },
    isAdminEmail,
    isAdminInDatabase: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      return !error && data === true;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  const result = await attemptLogin(deps, form.get("email"), form.get("password"));
  if (result.status === "ok") redirect("/admin");
  return { status: "error", message: result.message };
}
