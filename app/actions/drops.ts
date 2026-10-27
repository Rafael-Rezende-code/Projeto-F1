"use server";

import { headers } from "next/headers";
import { firstIp, hashIp, isValidEmail } from "@/lib/newsletter";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit-config";
import { DROP_WAITLIST_CONSENT_TEXT } from "@/lib/drops-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

export type DropWaitlistState = { status: "idle" | "ok" | "error" | "disabled"; message?: string };
const OK: DropWaitlistState = { status: "ok", message: "Pronto! Você recebe um e-mail quando o drop for lançado." };

// Lista de espera do drop (loja extra, item 6), mesmas camadas do "Avise-me": campo isca ("website") preenchido = robô
// (responde ok sem gravar); e-mail e consentimento; limite por IP aqui e no banco (gatilho); gravação com a chave
// PÚBLICA (a política só deixa inserir em drop ativo, com consentimento). Repetido responde o mesmo ok. Sem Supabase: "Em breve".
export async function joinDropWaitlist(_: DropWaitlistState, form: FormData): Promise<DropWaitlistState> {
  if (!isSupabaseConfigured()) return { status: "disabled", message: "Em breve." };
  if (String(form.get("website") ?? "").trim()) return OK;
  const dropId = String(form.get("drop") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(dropId)) return { status: "error", message: "Drop inválido. Atualize a página." };
  if (!isValidEmail(email)) return { status: "error", message: "Informe um e-mail válido." };
  if (form.get("consent") !== "on") return { status: "error", message: "Marque a caixa para receber o aviso." };
  const ip = firstIp((await headers()).get("x-forwarded-for"));
  if (!(await allowRequest("drop", ip))) return { status: "error", message: RATE_LIMIT_MESSAGE };
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEWSLETTER_IP_SALT ?? "";
  const { error } = await createPublicClient()
    .from("drop_waitlist")
    .insert({ drop_id: dropId, email, consent: true, consent_text: DROP_WAITLIST_CONSENT_TEXT, ip_hash: ip ? hashIp(ip, salt) : null });
  if (!error || error.code === "23505") return OK;
  if (/LIMITE_/.test(error.message)) return { status: "error", message: "Muitas tentativas. Tente de novo mais tarde." };
  console.error("[drop] lista de espera:", error.code); // sem o e-mail no log
  return { status: "error", message: "Não foi possível agora. Tente de novo em instantes." };
}
