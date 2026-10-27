import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./config";

// Clientes do Supabase para o SERVIDOR (server components, server actions, rotas). Sem sessão de usuário.

/** Leitura pública (chave anon, respeita RLS): catálogo ativo. */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Leitura pública para VITRINE (catálogo, kits, corridas, drops), com validade no cache de dados do Next. Sem isso, o
 * GET feito na renderização estática ficava em cache SEM PRAZO e sobrevivia a builds e deploys (na loja extra, a resposta
 * dos produtos de antes de uma migração voltou num build novo, sem os campos novos). Estoque e checkout NÃO usam este
 * cliente (getVariantBySku e as ações usam createPublicClient, sempre fresco).
 */
export const SHOWCASE_REVALIDATE = 300;
export function createShowcaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: SHOWCASE_REVALIDATE, tags: ["supabase-vitrine"] } } as RequestInit) },
  });
}

/** Service role (ignora RLS): pedidos, estoque e webhook. Só no servidor. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
