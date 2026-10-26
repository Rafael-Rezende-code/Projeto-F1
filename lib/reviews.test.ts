import { describe, expect, it } from "vitest";
import { aggregateRating, summarizeReviews, validateReview } from "./reviews";

const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
const good = { nota: "4", titulo: "Muito boa", texto: "Tecido bom e caimento certo.", nome: "Ana", produto: "camiseta-hamilton" };

describe("avaliações", () => {
  it("resumo: média com uma casa e contagem; sem avaliação, nada (nem aggregateRating)", () => {
    expect(summarizeReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ average: 4.3, count: 3 });
    expect(summarizeReviews([])).toBeNull();
    expect(aggregateRating(null)).toBeUndefined();
    expect(aggregateRating({ average: 4.3, count: 3 })).toEqual({ "@type": "AggregateRating", ratingValue: "4.3", reviewCount: 3, bestRating: "5", worstRating: "1" });
  });

  it("valida nota, título, texto, nome e produto com os limites do banco", () => {
    expect(validateReview(form(good))).toEqual({ ok: true, value: { rating: 4, title: "Muito boa", body: "Tecido bom e caimento certo.", displayName: "Ana", slug: "camiseta-hamilton" } });
    expect(validateReview(form({ ...good, nota: "6" })).ok).toBe(false);
    expect(validateReview(form({ ...good, nota: "3.5" })).ok).toBe(false);
    expect(validateReview(form({ ...good, texto: "curto" })).ok).toBe(false);
    expect(validateReview(form({ ...good, nome: "A" })).ok).toBe(false);
    expect(validateReview(form({ ...good, produto: "../x" })).ok).toBe(false);
  });
});
