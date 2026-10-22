import "server-only";
import { headers } from "next/headers";
import { firstIp, hashIp } from "@/lib/newsletter";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { RATE_LIMITS, type RateLimitBucket } from "@/lib/rate-limit-config";

// Limite de tentativas por IP, centralizado (operação 1d/fase 5): a contagem fica no banco (função rate_limit_hit,
// migração 20261027000000_consulta_e_limites.sql), o mesmo mecanismo da newsletter: o IP só entra como hash com sal
// (RATE_LIMIT_SALT; sem ela, NEWSLETTER_IP_SALT). Sem Supabase (modo simulado) não há limite. Se o banco falhar, deixa
// passar e registra no log: a ação em si ainda tem as próprias defesas (e quase sempre depende do mesmo banco).
export async function clientIp() {
  const list = await headers();
  return firstIp(list.get("x-forwarded-for")) ?? list.get("x-real-ip")?.trim() ?? null;
}

/** true = pode seguir; false = passou do limite (responda "Muitas tentativas"). */
export async function allowRequest(bucket: RateLimitBucket, ip?: string | null): Promise<boolean> {
  if (!isOrderStoreConfigured()) return true;
  const address = ip === undefined ? await clientIp() : ip;
  if (!address) return true;
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEWSLETTER_IP_SALT ?? "";
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_key_hash: hashIp(address, salt),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[limite] falha ao contar:", bucket, error.code);
    return true;
  }
  return data !== false;
}
