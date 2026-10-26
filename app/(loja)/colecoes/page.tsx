import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollectionCard } from "@/components/collection-card";
import { RevealGroup } from "@/components/motion/reveal-group";
import { PageIntro } from "@/components/page-intro";
import { catalog } from "@/lib/catalog";
import { collectionsWithProducts } from "@/lib/catalog/collections";

export const metadata: Metadata = {
  title: "Coleções",
  description: "Camisetas, miniaturas, colecionáveis e acessórios de Fórmula 1, reunidos por coleção.",
  alternates: { canonical: "/colecoes" },
};

// Índice das coleções (refino 3, item 1.4): só as que têm pelo menos 1 produto publicado.
export default async function CollectionsPage() {
  const list = collectionsWithProducts(await catalog.getProducts());
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Coleções" }]} />
        <div className="mt-8">
          <PageIntro eyebrow="Coleções" title="Escolha por onde começar" body="Peças reunidas por tipo: do que se veste no dia de prova ao que fica na estante." />
        </div>
        <RevealGroup className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map(({ collection, count }, index) => (
            <li key={collection.slug}>
              <CollectionCard
                href={`/colecoes/${collection.slug}`}
                eyebrow={String(index + 1).padStart(2, "0")}
                title={collection.title}
                subtitle={`${collection.phrase} ${count === 1 ? "1 peça" : `${count} peças`}`}
                image={collection.cover}
              />
            </li>
          ))}
        </RevealGroup>
      </div>
    </div>
  );
}
