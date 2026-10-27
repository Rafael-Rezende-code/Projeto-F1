import { getCollection } from "@/lib/content/collections";
import type { Product, ProductFilters, ProductSort } from "./types";

// Filtros do catálogo refletidos na URL (refino 3, frente 3): /produtos?q=&colecao=&categoria=&equipe=&piloto=&tamanho=
// &preco=&entrega=&disponivel=&ordem=&pagina=. q: texto da busca ("Ver todos os resultados" da busca do site).
// Regras puras (testes em filters.test.ts); o servidor filtra pelo repositório e o navegador usa as MESMAS regras
// (matchesFacets) para contar "Ver N produtos" na gaveta do celular e as quantidades de cada opção.
export const PRICE_RANGES = [
  { value: "ate-200", label: "Até R$ 200", min: undefined, max: 20000 },
  { value: "200-400", label: "R$ 200 a R$ 400", min: 20000, max: 40000 },
  { value: "400-700", label: "R$ 400 a R$ 700", min: 40000, max: 70000 },
  { value: "acima-700", label: "Acima de R$ 700", min: 70000, max: undefined },
] as const;

export const DELIVERY_OPTIONS = [
  { value: "pronta", label: "Pronta entrega", fulfillment: "estoque_proprio" },
  { value: "encomenda", label: "Sob encomenda", fulfillment: "sob_encomenda" },
] as const;

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "novidades", label: "Novidades" },
];

/** Produtos por página ("Carregar mais" e ?pagina=). */
export const PAGE_SIZE = 12;
/** Ordem dos tamanhos no filtro (os outros vêm depois, em ordem alfabética). */
const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XGG", "Único"];

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

export type CatalogParams = {
  q?: string;
  colecao?: string;
  /** Tags separadas por vírgula (loja extra: coleção do fim de semana de corrida e drops). Produto com qualquer uma. */
  tag?: string;
  categoria?: string;
  equipe?: string;
  piloto?: string;
  tamanho?: string;
  preco?: (typeof PRICE_RANGES)[number]["value"];
  entrega?: (typeof DELIVERY_OPTIONS)[number]["value"];
  disponivel?: "1";
  ordem: ProductSort;
  /** Página (1 = primeira). Só aparece na URL a partir da 2. */
  pagina?: string;
};

/** Filtros que o visitante liga e desliga (chips, gaveta, barra lateral). `q` e `colecao` vêm de fora (busca, coleção). */
export const FACET_KEYS = ["categoria", "equipe", "piloto", "tamanho", "preco", "entrega", "disponivel"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

export function parseCatalogParams(params: CatalogSearchParams): CatalogParams {
  const pagina = Number(one(params.pagina));
  return {
    q: one(params.q)?.trim().slice(0, 80) || undefined,
    colecao: getCollection(one(params.colecao) ?? "")?.slug,
    tag: cleanTags(one(params.tag)),
    categoria: one(params.categoria)?.slice(0, 60),
    equipe: one(params.equipe)?.slice(0, 60),
    piloto: one(params.piloto)?.slice(0, 60),
    tamanho: one(params.tamanho)?.slice(0, 20),
    preco: PRICE_RANGES.find((range) => range.value === one(params.preco))?.value,
    entrega: DELIVERY_OPTIONS.find((option) => option.value === one(params.entrega))?.value,
    disponivel: one(params.disponivel) === "1" ? "1" : undefined,
    ordem: SORT_OPTIONS.find((option) => option.value === one(params.ordem))?.value ?? "relevancia",
    pagina: Number.isInteger(pagina) && pagina > 1 && pagina <= 100 ? String(pagina) : undefined,
  };
}

export const pageOf = (params: CatalogParams) => Number(params.pagina ?? 1);

/** "a,b" → tags válidas (minúsculas, números e hífen), até 6. */
export function cleanTags(value: string | undefined) {
  const tags = [...new Set(String(value ?? "").toLowerCase().split(",").map((tag) => tag.trim()).filter((tag) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag) && tag.length <= 40))].slice(0, 6);
  return tags.length ? tags.join(",") : undefined;
}

/** Recorte de fora dos filtros (coleção OU tags): base das contagens e do resultado. */
export function baseCollection(parsed: Pick<CatalogParams, "colecao" | "tag">): ProductFilters["collection"] {
  if (parsed.colecao) return getCollection(parsed.colecao)?.filters;
  return parsed.tag ? { tags: parsed.tag.split(",") } : undefined;
}

export function toProductFilters(parsed: CatalogParams): ProductFilters {
  const range = PRICE_RANGES.find((item) => item.value === parsed.preco);
  return {
    query: parsed.q,
    collection: baseCollection(parsed),
    category: parsed.categoria,
    team: parsed.equipe,
    driver: parsed.piloto,
    size: parsed.tamanho,
    fulfillment: DELIVERY_OPTIONS.find((option) => option.value === parsed.entrega)?.fulfillment,
    inStock: parsed.disponivel === "1" || undefined,
    minPriceCents: range?.min,
    maxPriceCents: range?.max,
    sort: parsed.ordem,
  };
}

/** Monta a URL do catálogo a partir dos filtros atuais com alterações (undefined remove o parâmetro). Mudar qualquer
 *  filtro volta para a página 1 (a menos que a própria `pagina` mude). */
export function catalogHref(current: CatalogParams, changes: Partial<CatalogParams> = {}, base = "/produtos") {
  const next: Partial<CatalogParams> = { ...current, ...changes };
  if (!("pagina" in changes)) delete next.pagina;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && !(key === "ordem" && value === "relevancia")) query.set(key, value);
  }
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}

// ---------------------------------------------------------------------------------------------------------------------
// Facetas no navegador: cada produto vira um item compacto; as contagens usam as mesmas regras do repositório.

export type FacetItem = { category: string; team?: string; driver?: string; sizes: string[]; inStockSizes: string[]; price: number; fulfillment: Product["fulfillment"]; inStock: boolean };

export const facetOf = (product: Product): FacetItem => ({
  category: product.categorySlug,
  team: product.teamSlug,
  driver: product.driverSlug,
  sizes: product.variants.map((variant) => variant.size),
  inStockSizes: product.variants.filter((variant) => variant.stock > 0).map((variant) => variant.size),
  price: product.priceCents,
  fulfillment: product.fulfillment,
  inStock: product.variants.some((variant) => variant.stock > 0),
});

/** Regra das facetas (igual à do repositório: lib/catalog/memory-repository.ts). Tamanho + "só com estoque" exige
 *  estoque NAQUELE tamanho. */
export function matchesFacets(item: FacetItem, params: Pick<CatalogParams, FacetKey>) {
  const range = PRICE_RANGES.find((option) => option.value === params.preco);
  const fulfillment = DELIVERY_OPTIONS.find((option) => option.value === params.entrega)?.fulfillment;
  return (
    (!params.categoria || item.category === params.categoria) &&
    (!params.equipe || item.team === params.equipe) &&
    (!params.piloto || item.driver === params.piloto) &&
    (!params.tamanho || (params.disponivel ? item.inStockSizes : item.sizes).includes(params.tamanho)) &&
    (!range || ((range.min === undefined || item.price >= range.min) && (range.max === undefined || item.price <= range.max))) &&
    (!fulfillment || item.fulfillment === fulfillment) &&
    (!params.disponivel || item.inStock)
  );
}

export const countFacets = (items: FacetItem[], params: Pick<CatalogParams, FacetKey>) => items.filter((item) => matchesFacets(item, params)).length;

/** Filtros ligados, na ordem das chaves. */
export const activeFacets = (params: CatalogParams) => FACET_KEYS.filter((key) => Boolean(params[key]));

/**
 * Estado vazio: qual filtro, removido sozinho, devolve MAIS produtos (o "mais restritivo"). null se nenhum devolve algo.
 */
export function mostRestrictiveFacet(items: FacetItem[], params: CatalogParams) {
  let best: { key: FacetKey; count: number } | null = null;
  for (const key of activeFacets(params)) {
    const count = countFacets(items, { ...params, [key]: undefined });
    if (count > 0 && (!best || count > best.count)) best = { key, count };
  }
  return best;
}

/** Tamanhos que existem na lista, na ordem de roupa (PP → GG) e depois os outros. */
export function sizeOptions(items: FacetItem[]) {
  const all = [...new Set(items.flatMap((item) => item.sizes))];
  const rank = (size: string) => (SIZE_ORDER.includes(size) ? SIZE_ORDER.indexOf(size) : SIZE_ORDER.length);
  return all.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"));
}

/** Itens de 1 até a página pedida (a URL ?pagina=N mostra as N primeiras páginas: compartilhável e indexável). */
export const firstPages = <T,>(list: T[], page: number, size = PAGE_SIZE) => list.slice(0, Math.max(1, page) * size);
/** Só a página pedida ("Carregar mais" anexa esta fatia). */
export const onlyPage = <T,>(list: T[], page: number, size = PAGE_SIZE) => list.slice((Math.max(1, page) - 1) * size, Math.max(1, page) * size);
