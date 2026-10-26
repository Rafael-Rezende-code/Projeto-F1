import { ReviewsList } from "@/components/product-reviews";

// SÓ EM DESENVOLVIMENTO (components/product-reviews.tsx importa este arquivo apenas com NODE_ENV === "development"):
// bloco de pré-visualização do layout das avaliações. NÃO é avaliação real e não existe no build de produção (teste em
// lib/reviews-build.test.ts procura o marcador no .next). Nunca usar estes dados em seed, Preview ou produção.
export const REVIEWS_EXAMPLE_MARKER = "EXEMPLO DE LAYOUT — não é avaliação real";

export function ReviewsExample() {
  const now = new Date().toISOString();
  return (
    <ReviewsList
      summary={{ average: 4.5, count: 2 }}
      note={<p className="mb-6 rounded-xl border-2 border-dashed border-[#b42318] bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#8a1c12]">{REVIEWS_EXAMPLE_MARKER} (só no ambiente de desenvolvimento)</p>}
      reviews={[
        { id: "exemplo-1", rating: 5, title: "[EXEMPLO] Título da avaliação", body: "[EXEMPLO] Texto de uma avaliação para conferir o layout. Não é de um cliente.", displayName: "[Exemplo]", createdAt: now },
        { id: "exemplo-2", rating: 4, title: "[EXEMPLO] Outra avaliação", body: "[EXEMPLO] Segundo bloco de exemplo, com texto um pouco mais longo para ver a quebra de linha na grade.", displayName: "[Exemplo]", createdAt: now },
      ]}
    />
  );
}
