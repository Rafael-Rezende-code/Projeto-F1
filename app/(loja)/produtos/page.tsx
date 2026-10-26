import Link from "next/link";
import type { Metadata } from "next";
import { X } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CatalogFilters } from "@/components/catalog-filters";
import { PageIntro } from "@/components/page-intro";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { catalogHref, parseCatalogParams, PRICE_RANGES, toProductFilters, type CatalogSearchParams } from "@/lib/catalog/filters";
import { getCollection } from "@/lib/content/collections";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Roupas, acessórios e colecionáveis de Fórmula 1: filtre por categoria, equipe, piloto e preço.",
  alternates: { canonical: "/produtos" },
};

type ChipKey = "q" | "colecao" | "categoria" | "equipe" | "piloto" | "preco";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const current = parseCatalogParams(await searchParams);
  const [products, categories, teams, drivers] = await Promise.all([
    catalog.getProducts(toProductFilters(current)),
    catalog.getCategories(),
    catalog.getTeams(),
    catalog.getDrivers(),
  ]);

  // Filtros ativos viram "chips" removíveis.
  const chips: { key: ChipKey; label: string }[] = [];
  if (current.q) chips.push({ key: "q", label: `Busca: “${current.q}”` });
  if (current.colecao) chips.push({ key: "colecao", label: `Coleção: ${getCollection(current.colecao)?.title ?? current.colecao}` });
  if (current.categoria) chips.push({ key: "categoria", label: categories.find((c) => c.slug === current.categoria)?.name ?? current.categoria });
  if (current.equipe) chips.push({ key: "equipe", label: teams.find((t) => t.slug === current.equipe)?.name ?? current.equipe });
  if (current.piloto) chips.push({ key: "piloto", label: drivers.find((d) => d.slug === current.piloto)?.name ?? current.piloto });
  if (current.preco) chips.push({ key: "preco", label: PRICE_RANGES.find((p) => p.value === current.preco)?.label ?? current.preco });

  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Produtos" }]} />
        <div className="mt-8">
          <PageIntro eyebrow="A coleção" title="Todos os produtos" body="Roupas, acessórios e colecionáveis inspirados nas equipes e nos pilotos do grid." />
        </div>

        <div className="mt-10 border-y border-black/10 py-6">
          <CatalogFilters
            current={current}
            categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
            teams={teams.map((t) => ({ value: t.slug, label: t.name }))}
            drivers={drivers.map((d) => ({ value: d.slug, label: d.name }))}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <p aria-live="polite" className="mr-2 text-black/60">
              {products.length === 1 ? "1 produto" : `${products.length} produtos`}
            </p>
            {chips.map((chip) => (
              <Link
                key={chip.key}
                href={catalogHref(current, { [chip.key]: undefined })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 px-3 py-1.5 text-xs transition hover:border-black"
                aria-label={`Remover filtro ${chip.label}`}
              >
                {chip.label} <X size={12} aria-hidden="true" />
              </Link>
            ))}
            {chips.length > 0 && (
              <Link
                href={catalogHref({ ordem: current.ordem, q: undefined, colecao: undefined, categoria: undefined, equipe: undefined, piloto: undefined, preco: undefined })}
                className="text-xs text-black/60 underline underline-offset-4 hover:text-black"
              >
                Limpar filtros
              </Link>
            )}
          </div>
        </div>

        <div className="mt-10">
          {products.length > 0 ? (
            <ProductGrid products={products} priorityCount={4} />
          ) : (
            <div className="mx-auto max-w-md rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Nenhum resultado</p>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.05em]">Nada no grid com esses filtros.</h2>
              <p className="mt-3 text-sm leading-6 text-black/60">Tente remover algum filtro ou escolher outra faixa de preço.</p>
              <Link href="/produtos" className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">
                Ver todos os produtos
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
