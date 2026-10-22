"use server";

import { headers } from "next/headers";
import { firstIp, hashIp, isValidEmail, NEWSLETTER_CONSENT_TEXT, readSubscription } from "@/lib/newsletter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

export type NewsletterState = { status: "idle" | "ok" | "error" | "disabled"; message?: string };

const OK: NewsletterState = { status: "ok", message: "Pronto! Seu e-mail está na lista." };

// Inscrição na newsletter. Camadas contra abuso: (1) campo isca ("website") preenchido = robô, responde "ok" sem gravar;
// (2) e-mail validado e consentimento obrigatório; (3) limite por IP e total no próprio banco (gatilho
// newsletter_limits), com o IP guardado só como hash com sal (NEWSLETTER_IP_SALT); (4) a gravação usa a chave PÚBLICA
// (anon), então vale a política de RLS "inscricao publica": só insere, com consentimento, nas 5 colunas liberadas.
// E-mail que já estava na lista responde o mesmo "ok" (não revela quem já se inscreveu). Sem Supabase: desligada.
export async function subscribeNewsletter(_: NewsletterState, form: FormData): Promise<NewsletterState> {
  if (!isSupabaseConfigured()) return { status: "disabled", message: "Em breve." };
  const input = readSubscription(form);
  if (input.honeypot) return OK;
  if (!isValidEmail(input.email)) return { status: "error", message: "Informe um e-mail válido." };
  if (!input.consent) return { status: "error", message: "Marque a caixa para concordar em receber as novidades." };

  const ip = firstIp((await headers()).get("x-forwarded-for"));
  const salt = process.env.NEWSLETTER_IP_SALT ?? "";
  const { error } = await createPublicClient()
    .from("newsletter_subscribers")
    .insert({ email: input.email, consent: true, consent_text: NEWSLETTER_CONSENT_TEXT, source: "home", ip_hash: ip ? hashIp(ip, salt) : null });
  if (!error) return OK;
  if (error.code === "23505") return OK; // já estava na lista
  if (/LIMITE_/.test(error.message)) return { status: "error", message: "Muitas tentativas. Tente de novo mais tarde." };
  console.error("[newsletter] falha ao gravar:", error.code, error.message); // sem o e-mail no log
  return { status: "error", message: "Não foi possível agora. Tente de novo em instantes." };
}
