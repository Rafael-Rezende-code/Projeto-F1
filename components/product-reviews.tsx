import { Stars } from "@/components/stars";
import { reviewDate, type Review, type ReviewSummary } from "@/lib/reviews";

// Avaliações na página do produto (refino 3, item 2.5): só APROVADAS, com o resumo (média e quantidade) quando houver pelo
// menos uma. Sem avaliação aprovada, nada é mostrado ao público. Em desenvolvimento (NODE_ENV === "development"), um bloco
// de exemplo MARCADO entra no lugar para conferir o layout (components/reviews-example.tsx, importado só em dev).
export async function ProductReviews({ reviews, summary }: { reviews: Review[]; summary: ReviewSummary | null }) {
  if (!summary) {
    if (process.env.NODE_ENV === "development") {
      const { ReviewsExample } = await import("@/components/reviews-example");
      return <ReviewsExample />;
    }
    return null;
  }
  return <ReviewsList reviews={reviews} summary={summary} />;
}

export function ReviewsList({ reviews, summary, note }: { reviews: Review[]; summary: ReviewSummary; note?: React.ReactNode }) {
  return (
    <section id="avaliacoes" aria-labelledby="avaliacoes-titulo" className="mt-24 scroll-mt-24 text-black">
      {note}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Quem comprou</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="avaliacoes-titulo" className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl">Avaliações</h2>
        <p className="flex items-center gap-3 text-sm text-black/70">
          <Stars rating={summary.average} size={18} />
          <span>
            <strong className="font-medium text-black">{summary.average.toFixed(1).replace(".", ",")}</strong> de 5 · {summary.count === 1 ? "1 avaliação" : `${summary.count} avaliações`}
          </span>
        </p>
      </div>
      <ul role="list" className="mt-8 grid gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-2xl bg-[#f5f5f3] p-6">
            <Stars rating={review.rating} />
            <h3 className="mt-3 font-medium">{review.title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/70">{review.body}</p>
            <p className="mt-4 text-xs text-black/60">
              {review.displayName} · {reviewDate(review.createdAt)} · Compra confirmada
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
