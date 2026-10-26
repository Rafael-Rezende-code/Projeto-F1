// Avaliações de produto (refino 3, item 2.5): regras puras (testes em reviews.test.ts). DESLIGADAS por padrão: só com
// NEXT_PUBLIC_REVIEWS_ENABLED=true (lida no build) e com o Supabase configurado. Tabela reviews e função submit_review na
// migração 20261101000000_avaliacoes.sql. Não existe dado de exemplo em seed, build, Preview ou produção; o bloco de
// pré-visualização do layout (components/reviews-example.tsx) só aparece com NODE_ENV === "development".

export const REVIEWS_ENABLED = process.env.NEXT_PUBLIC_REVIEWS_ENABLED === "true";

export type Review = { id: string; rating: number; title: string; body: string; displayName: string; createdAt: string };
export type ReviewSummary = { average: number; count: number };

/** Média com uma casa e contagem; null sem avaliação (aí não há resumo nem aggregateRating). */
export function summarizeReviews(reviews: Pick<Review, "rating">[]): ReviewSummary | null {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return { average: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
}

/** JSON-LD AggregateRating (schema.org) só com pelo menos 1 avaliação aprovada. */
export const aggregateRating = (summary: ReviewSummary | null) =>
  summary ? { "@type": "AggregateRating", ratingValue: summary.average.toFixed(1), reviewCount: summary.count, bestRating: "5", worstRating: "1" } : undefined;

export type ReviewInput = { rating: number; title: string; body: string; displayName: string; slug: string };
export type ReviewCheck = { ok: true; value: ReviewInput } | { ok: false; message: string };

/** Valida o formulário (os mesmos limites do banco). */
export function validateReview(form: { get(name: string): FormDataEntryValue | null }): ReviewCheck {
  const rating = Number(form.get("nota"));
  const title = String(form.get("titulo") ?? "").trim();
  const body = String(form.get("texto") ?? "").trim();
  const displayName = String(form.get("nome") ?? "").trim();
  const slug = String(form.get("produto") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Escolha uma nota de 1 a 5 estrelas." };
  if (title.length < 2 || title.length > 80) return { ok: false, message: "Dê um título (até 80 caracteres)." };
  if (body.length < 10 || body.length > 2000) return { ok: false, message: "Conte um pouco mais (de 10 a 2.000 caracteres)." };
  if (displayName.length < 2 || displayName.length > 40) return { ok: false, message: "Informe como seu nome deve aparecer (2 a 40 caracteres)." };
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return { ok: false, message: "Produto inválido." };
  return { ok: true, value: { rating, title, body, displayName, slug } };
}

/** Respostas da função submit_review em português. */
export const REVIEW_RESULT_MESSAGES: Record<string, string> = {
  ok: "Obrigado! Sua avaliação foi recebida e aparece no site depois da moderação.",
  ja_avaliado: "Você já avaliou este produto neste pedido.",
  nao_entregue: "A avaliação abre quando o pedido for entregue.",
  nao_encontrado: "Não encontramos um pedido com esse número e e-mail.",
  produto_fora_do_pedido: "Este produto não está neste pedido.",
};

/** Texto da data ("26 de out. de 2026"). */
export const reviewDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
