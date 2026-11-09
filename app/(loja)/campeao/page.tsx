import type { Metadata } from "next";
import { CampeaoBandeira } from "@/components/campeao/bandeira";
import { CampeaoColecao } from "@/components/campeao/colecao";
import { CoroacaoCena } from "@/components/campeao/coroacao";
import { catalog } from "@/lib/catalog";
import { CAMPEAO_CHAPTERS, CAMPEAO_META } from "@/lib/campeao";
import { championProducts } from "@/lib/campeao-products";

// Sessão do Campeão (/campeao): página dirigida por dados (CAMPEAO_CHAPTERS em lib/campeao.ts). Capítulos: a Coroação
// (cena guiada pela rolagem), a bandeira + números e a coleção (#colecao, tag `antonelli`). Fora do índice enquanto
// NEXT_PUBLIC_ALLOW_INDEXING não existir (regra global do layout). Imagem de compartilhamento: ./opengraph-image.tsx.
export const metadata: Metadata = {
  title: CAMPEAO_META.title,
  description: CAMPEAO_META.description,
  alternates: { canonical: "/campeao" },
  openGraph: { title: CAMPEAO_META.title, description: CAMPEAO_META.description, type: "website" },
  twitter: { card: "summary_large_image", title: CAMPEAO_META.title, description: CAMPEAO_META.description },
};

// Produtos entram pelo admin (Supabase): a página é refeita de hora em hora (como a home).
export const revalidate = 3600;

export default async function CampeaoPage() {
  const products = championProducts(await catalog.getProducts());
  return (
    <div className="bg-[#e4dfdc]">
      {CAMPEAO_CHAPTERS.map((chapter) => {
        switch (chapter.kind) {
          case "coroacao":
            return <CoroacaoCena key={chapter.id} />;
          case "bandeira":
            return <CampeaoBandeira key={chapter.id} />;
          case "colecao":
            return <CampeaoColecao key={chapter.id} chapter={chapter} products={products} />;
        }
      })}
    </div>
  );
}
