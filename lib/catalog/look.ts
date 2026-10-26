import type { Product } from "./types";

// "Complete o look" da página de produto (refino 3, item 2.3). Puro e testado (look.test.ts).
// Só produtos de OUTRAS categorias. Preferência: mesmo piloto (4) > mesma equipe (2) > o resto; entre iguais, uma peça
// de cada categoria primeiro (variedade) e a ordem do catálogo. Sempre 3 ou 4 quando o catálogo tiver; se faltar
// parentesco, completa com destaques e o catálogo de outras categorias.
export function completeTheLook(product: Product, catalog: Product[], limit = 4): Product[] {
  const others = catalog.filter((other) => other.id !== product.id && other.categorySlug !== product.categorySlug);
  const score = (other: Product) =>
    (product.driverSlug && other.driverSlug === product.driverSlug ? 4 : 0) + (product.teamSlug && other.teamSlug === product.teamSlug ? 2 : 0) + (other.featured ? 0.5 : 0);
  const ranked = others.map((other, index) => ({ other, index, score: score(other) })).sort((a, b) => b.score - a.score || a.index - b.index);

  const picked: Product[] = [];
  const categories = new Set<string>();
  // 1ª passada: o melhor de cada categoria; 2ª: completa com o que sobrou, na mesma ordem.
  for (const { other } of ranked) {
    if (picked.length >= limit) break;
    if (categories.has(other.categorySlug)) continue;
    picked.push(other);
    categories.add(other.categorySlug);
  }
  for (const { other } of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(other)) picked.push(other);
  }
  return picked;
}

/** Vistos recentemente (localStorage): o produto atual vai para o começo, sem repetir, no máximo `max` guardados. */
export function pushRecent(list: string[], slug: string, max = 7) {
  return [slug, ...list.filter((item) => item !== slug)].slice(0, max);
}
