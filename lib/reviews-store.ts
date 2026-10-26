import "server-only";
import { isOrderStoreConfigured, isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient, createServiceClient } from "@/lib/supabase/server";
import { REVIEWS_ENABLED, type Review } from "@/lib/reviews";

// Avaliações no Supabase (refino 3, item 2.5). Leitura PÚBLICA (chave anon): só aprovadas e só as colunas de exibição (RLS
// + permissão de coluna). Envio e "já avaliados": só pelo servidor (service role), pelas funções submit_review e
// reviewed_products. Desligado (flag ou sem Supabase): lista vazia e nada é gravado.
export async function getApprovedReviews(slug: string, limit = 20): Promise<Review[]> {
  if (!REVIEWS_ENABLED || !isSupabaseConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, rating, title, body, display_name, created_at")
    .eq("product_slug", slug)
    .eq("status", "aprovada")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => ({ id: row.id, rating: row.rating, title: row.title, body: row.body, displayName: row.display_name, createdAt: row.created_at }));
}

export async function submitStoredReview(input: { orderId: string; email: string; slug: string; rating: number; title: string; body: string; displayName: string }) {
  const { data, error } = await createServiceClient().rpc("submit_review", {
    p_order_id: input.orderId,
    p_email: input.email,
    p_product_slug: input.slug,
    p_rating: input.rating,
    p_title: input.title,
    p_body: input.body,
    p_display_name: input.displayName,
  });
  if (error) throw new Error(error.code ?? "erro");
  return String(data);
}

/** Produtos deste pedido que já têm avaliação (qualquer status). */
export async function reviewedProducts(orderId: string, email: string): Promise<string[]> {
  if (!REVIEWS_ENABLED || !isOrderStoreConfigured()) return [];
  const { data, error } = await createServiceClient().rpc("reviewed_products", { p_order_id: orderId, p_email: email });
  return error ? [] : ((data ?? []) as string[]);
}
