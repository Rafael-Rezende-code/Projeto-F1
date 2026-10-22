import type { Metadata } from "next";
import { ArticleCard } from "@/components/article-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { articles } from "@/lib/content/diario";

export const metadata: Metadata = {
  title: "Diário",
  description: "Histórias, personagens e a cultura da Fórmula 1, contadas por fãs.",
  alternates: { canonical: "/diario" },
};

// Índice do Diário (fase 6): o artigo mais recente em destaque e os outros numa grade de 2 colunas.
export default function DiarioPage() {
  const [latest, ...rest] = articles;
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Diário" }]} />
        <div className="mt-8">
          <PageIntro eyebrow="Diário" title="Histórias de quem vive a corrida." body="Personagens, memórias e a cultura da Fórmula 1, contados por fãs. Texto editorial independente." />
        </div>
        {latest && (
          <div className="mt-14 sm:mt-20">
            <ArticleCard article={latest} featured />
          </div>
        )}
        {rest.length > 0 && (
          <ul role="list" className="mt-16 grid gap-14 border-t border-black/10 pt-14 md:grid-cols-2 md:gap-10">
            {rest.map((article) => (
              <li key={article.slug}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
