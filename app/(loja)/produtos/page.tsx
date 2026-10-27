import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CatalogChips, CatalogLayout, CatalogSheet, CatalogSidebar, CatalogSort, type FacetOptions } from "@/components/catalog-filters";
import { LoadMore } from "@/components/load-more";
import { PageIntro } from "@/components/page-intro";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import {
  activeFacets,
  catalogHref,
  DELIVERY_OPTIONS,
  facetOf,
  firstPages,
  mostRestrictiveFacet,
  pageOf,
  baseCollection,
  parseCatalogParams,
  PRICE_RANGES,
  sizeOptions,
  toProductFilters,
  type CatalogParams,
  type CatalogSearchParams,
  type FacetKey,
} from "@/lib/catalog/filters";
import { getCollection } from "@/lib/content/collections";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Roupas, acessórios e colecionáveis de Fórmula 1: filtre por categoria, equipe, piloto, tamanho, preço e entrega.",
  alternates: { canonical: "/produtos" },
};

// Catálogo (refino 3, frente 3): filtros na URL (barra lateral no desktop, gaveta no celular), chips removíveis, contagem,
// ordenação e "Carregar mais" (?pagina=N renderiza as N primeiras páginas no servidor). Estado vazio sugere tirar o
// filtro que mais restringe. A busca (q) e a coleção vêm de fora e ficam fixas nas contagens.
const LABELS: Record<FacetKey, string> = { categoria: "Categoria", equipe: "Equipe", piloto: "Piloto", tamanho: "Tamanho", preco: "Preço", entrega: "Entrega", disponivel: "Disponibilidade" };

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const current = parseCatalogParams(await searchParams);
  const [products, base, categories, teams, drivers] = await Promise.all([
    catalog.getProducts(toProductFilters(current)),
    // Base das contagens: só a busca e a coleção (os outros filtros o visitante liga e desliga).
    catalog.getProducts({ query: current.q, collection: baseCollection(current) }),
    catalog.getCategories(),
    catalog.getTeams(),
    catalog.getDrivers(),
  ]);
  const items = base.map(facetOf);
  const options: FacetOptions = {
    categories: categories.map((c) => ({ value: c.slug, label: c.name })),
    teams: teams.map((t) => ({ value: t.slug, label: t.name })),
    drivers: drivers.map((d) => ({ value: d.slug, label: d.name })),
    sizes: sizeOptions(items),
  };
  const page = pageOf(current);
  const visible = firstPages(products, page);

  // Rótulo legível de cada filtro ativo (chips e sugestão do estado vazio).
  const valueLabel = (key: FacetKey, params: CatalogParams = current): string => {
    const value = params[key] ?? "";
    if (key === "categoria") return categories.find((c) => c.slug === value)?.name ?? value;
    if (key === "equipe") return teams.find((t) => t.slug === value)?.name ?? value;
    if (key === "piloto") return drivers.find((d) => d.slug === value)?.name ?? value;
    if (key === "tamanho") return `Tamanho ${value}`;
    if (key === "preco") return PRICE_RANGES.find((p) => p.value === value)?.label ?? value;
    if (key === "entrega") return DELIVERY_OPTIONS.find((d) => d.value === value)?.label ?? value;
    return "Só com estoque";
  };
  const chips = [
    ...(current.q ? [{ key: "q", label: `Busca: “${current.q}”`, href: catalogHref(current, { q: undefined }) }] : []),
    ...(current.tag && !current.colecao ? [{ key: "tag", label: `Seleção: ${current.tag.split(",").join(", ")}`, href: catalogHref(current, { tag: undefined }) }] : []),
    ...(current.colecao ? [{ key: "colecao", label: `Coleção: ${getCollection(current.colecao)?.title ?? current.colecao}`, href: catalogHref(current, { colecao: undefined }) }] : []),
    ...activeFacets(current).map((key) => ({ key, label: valueLabel(key), href: catalogHref(current, { [key]: undefined }) })),
  ];
  const clearHref = catalogHref({ ordem: current.ordem });
  const suggestion = products.length === 0 ? mostRestrictiveFacet(items, current) : null;

  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Produtos" }]} />
        <div className="mt-8">
          <div className="enter-title">
          <PageIntro eyebrow="A coleção" title="Todos os produtos" body="Roupas, acessórios e colecionáveis inspirados nas equipes e nos pilotos do grid." />
          </div>
        </div>

        <div className="mt-10">
          <CatalogLayout activeCount={activeFacets(current).length} sidebar={<CatalogSidebar current={current} items={items} options={options} />}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-5">
              <p aria-live="polite" className="text-sm text-black/60">
                {products.length === 1 ? "1 produto" : `${products.length} produtos`}
              </p>
              <div className="flex items-center gap-2">
                <CatalogSheet current={current} items={items} options={options} />
                <CatalogSort current={current} />
              </div>
            </div>
            {chips.length > 0 && (
              <div className="mt-4">
                <CatalogChips chips={chips} clearHref={clearHref} />
              </div>
            )}

            <div className="enter-grid mt-10">
              {products.length > 0 ? (
                <>
                  <ProductGrid products={visible} priorityCount={4} layout="catalogo" />
                  <LoadMore key={catalogHref(current, { pagina: undefined })} current={current} page={page} total={products.length} shown={visible.length} />
                </>
              ) : (
                <div className="mx-auto max-w-md rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center text-black">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Nenhum resultado</p>
                  <h2 className="mt-3 text-2xl font-medium tracking-[-0.05em]">Nada no grid com esses filtros.</h2>
                  {suggestion ? (
                    <>
                      <p className="mt-3 text-sm leading-6 text-black/60">
                        Sem o filtro “{valueLabel(suggestion.key)}” ({LABELS[suggestion.key].toLowerCase()}), aparecem {suggestion.count === 1 ? "1 produto" : `${suggestion.count} produtos`}.
                      </p>
                      <Link href={catalogHref(current, { [suggestion.key]: undefined })} scroll={false} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">
                        Remover “{valueLabel(suggestion.key)}”
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-sm leading-6 text-black/60">Tente outra busca ou veja tudo o que está no grid.</p>
                      <Link href="/produtos" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 py-3 text-xs font-medium text-white transition hover:bg-[#b94f01]">
                        Ver todos os produtos
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </CatalogLayout>
        </div>
      </div>
    </div>
  );
}
