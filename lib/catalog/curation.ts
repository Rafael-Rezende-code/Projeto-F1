import type { Product } from "./types";

// Curadoria da vitrine (refino 3, itens 1.2 e 1.3). Regras puras, com testes (curation.test.ts); valem para o seed e
// para o Supabase (as duas fontes passam pelo MemoryCatalogRepository).

/** Hoje (AAAA-MM-DD) no fuso da loja (São Paulo). As páginas são estáticas: a data vale no build/revalidação. */
export const todayInStore = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

/** "NOVO": marcado como novo OU dentro do prazo de `newUntil` (inclusive). */
export const isNewProduct = (product: Pick<Product, "isNew" | "newUntil">, today = todayInStore()) =>
  product.isNew || Boolean(product.newUntil && product.newUntil >= today);

export const BESTSELLER_LIMIT = 8;
/** A seção nunca fica vazia nem com uma fileira pela metade no desktop: completa até este mínimo. */
export const BESTSELLER_MINIMUM = 4;

/**
 * "Mais vendidos", nesta ordem: (1) os marcados pela loja (`bestsellerManual`), por `bestsellerRank` (sem número vão
 * depois, na ordem do catálogo); (2) para completar até `limit`, os mais vendidos de verdade (`soldSlugs`, já em ordem
 * de quantidade: pedidos pagos dos últimos 90 dias, sem testes; função bestseller_slugs no banco); (3) os destaques
 * (`featured`). Se ainda ficar abaixo de `minimum`, completa com o catálogo na ordem de relevância. Nunca vazia (com
 * pelo menos um produto ativo). Nenhuma contagem de vendas sai daqui.
 */
export function pickBestsellers(active: Product[], soldSlugs: string[] = [], limit = BESTSELLER_LIMIT, minimum = BESTSELLER_MINIMUM): Product[] {
  const picked: Product[] = [];
  const add = (product: Product | undefined) => {
    if (product && picked.length < limit && !picked.some((item) => item.id === product.id)) picked.push(product);
  };
  const order = new Map(active.map((product, index) => [product.id, index]));
  const rank = (product: Product) => product.bestsellerRank ?? Number.MAX_SAFE_INTEGER;
  active
    .filter((product) => product.bestsellerManual)
    .sort((a, b) => rank(a) - rank(b) || order.get(a.id)! - order.get(b.id)!)
    .forEach(add);
  for (const slug of soldSlugs) add(active.find((product) => product.slug === slug));
  active.filter((product) => product.featured).forEach(add);
  for (const product of active) {
    if (picked.length >= Math.min(minimum, limit)) break;
    add(product);
  }
  return picked;
}
