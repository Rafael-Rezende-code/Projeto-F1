import type { Metadata } from "next";

// Indexação por buscadores (lançamento, item 2). Enquanto NEXT_PUBLIC_ALLOW_INDEXING não for exatamente "true", o site
// inteiro fica FORA do índice: robots.txt com "Disallow: /", meta robots "noindex, nofollow" em todas as páginas,
// cabeçalho X-Robots-Tag (next.config.mjs) e sitemap vazio. A variável é lida no BUILD: depois de mudar, novo deploy.
// Dia do lançamento: docs/lancamento.md.
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

/** Robots padrão do site (layout raiz). */
export const siteRobots: Metadata["robots"] = ALLOW_INDEXING
  ? { index: true, follow: true }
  : { index: false, follow: false, googleBot: { index: false, follow: false } };

/** Páginas que nunca entram no índice (sacola, checkout, pedido, favoritos), mesmo depois do lançamento. */
export const privateRobots: Metadata["robots"] = ALLOW_INDEXING
  ? { index: false, follow: true }
  : { index: false, follow: false, googleBot: { index: false, follow: false } };
