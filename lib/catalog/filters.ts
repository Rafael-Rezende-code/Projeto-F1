import type { ProductFilters, ProductSort } from "./types";

// Filtros do catálogo refletidos na URL (/produtos?q=...&categoria=...&equipe=...&piloto=...&preco=...&ordem=...).
// q: texto da busca ("Ver todos os resultados" da busca do site).
export const PRICE_RANGES = [
  { value: "ate-200", label: "Até R$ 200", min: undefined, max: 20000 },
  { value: "200-400", label: "R$ 200 a R$ 400", min: 20000, max: 40000 },
  { value: "400-700", label: "R$ 400 a R$ 700", min: 40000, max: 70000 },
  { value: "acima-700", label: "Acima de R$ 700", min: 70000, max: undefined },
] as const;

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "novidades", label: "Novidades" },
];

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

export function parseCatalogParams(params: CatalogSearchParams) {
  const categoria = one(params.categoria);
  const equipe = one(params.equipe);
  const piloto = one(params.piloto);
  const preco = PRICE_RANGES.find((range) => range.value === one(params.preco))?.value;
  const ordem = SORT_OPTIONS.find((option) => option.value === one(params.ordem))?.value ?? "relevancia";
  const q = one(params.q)?.trim().slice(0, 80) || undefined;
  return { q, categoria, equipe, piloto, preco, ordem };
}

export function toProductFilters(parsed: ReturnType<typeof parseCatalogParams>): ProductFilters {
  const range = PRICE_RANGES.find((item) => item.value === parsed.preco);
  return {
    query: parsed.q,
    category: parsed.categoria,
    team: parsed.equipe,
    driver: parsed.piloto,
    minPriceCents: range?.min,
    maxPriceCents: range?.max,
    sort: parsed.ordem,
  };
}

/** Monta a URL do catálogo a partir dos filtros atuais com alterações (undefined remove o parâmetro). */
export function catalogHref(current: ReturnType<typeof parseCatalogParams>, changes: Partial<ReturnType<typeof parseCatalogParams>> = {}) {
  const next = { ...current, ...changes };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && !(key === "ordem" && value === "relevancia")) query.set(key, value);
  }
  const text = query.toString();
  return text ? `/produtos?${text}` : "/produtos";
}
