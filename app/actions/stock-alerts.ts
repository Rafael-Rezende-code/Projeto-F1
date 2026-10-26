"use server";

import { headers } from "next/headers";
import { firstIp, hashIp } from "@/lib/newsletter";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit-config";
import { readStockAlert, STOCK_ALERT_CONSENT_TEXT, validateStockAlert } from "@/lib/stock-alerts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

export type StockAlertState = { status: "idle" | "ok" | "error" | "disabled"; message?: string };

const OK: StockAlertState = { status: "ok", message: "Pronto! Avisamos neste e-mail quando o tamanho voltar." };

// "Avise-me quando chegar" (refino 3, item 2.4), mesmas camadas da newsletter: campo isca ("website") preenchido = robô,
// responde "ok" sem gravar; e-mail e consentimento validados; limite por IP aqui (lib/rate-limit.ts) e no banco (gatilho);
// a gravação usa a chave PÚBLICA, então vale a política "aviso publico" (só insere, com consentimento, só para tamanho
// esgotado de produto publicado). Pedido repetido responde o mesmo "ok". Sem Supabase: desligado ("Em breve").
export async function requestStockAlert(_: StockAlertState, form: FormData): Promise<StockAlertState> {
  if (!isSupabaseConfigured()) return { status: "disabled", message: "Em breve." };
  const input = readStockAlert(form);
  if (input.honeypot) return OK;
  const check = validateStockAlert(input);
  if (!check.ok) return { status: "error", message: check.message };

  const ip = firstIp((await headers()).get("x-forwarded-for"));
  if (!(await allowRequest("avise-me", ip))) return { status: "error", message: RATE_LIMIT_MESSAGE };
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEWSLETTER_IP_SALT ?? "";
  const { error } = await createPublicClient()
    .from("stock_alerts")
    .insert({ email: input.email, sku: input.sku, consent: true, consent_text: STOCK_ALERT_CONSENT_TEXT, ip_hash: ip ? hashIp(ip, salt) : null });
  if (!error || error.code === "23505") return OK; // 23505: já tinha pedido este aviso
  if (/LIMITE_/.test(error.message)) return { status: "error", message: "Muitas tentativas. Tente de novo mais tarde." };
  if (error.code === "42501") return { status: "error", message: "Este tamanho já voltou ao estoque. Atualize a página." };
  console.error("[avise-me] falha ao gravar:", error.code); // sem o e-mail no log
  return { status: "error", message: "Não foi possível agora. Tente de novo em instantes." };
}
