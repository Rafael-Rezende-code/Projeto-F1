// Artigos do Diário (fase 6 da rodada de conteúdo): /diario e /diario/[slug]. Texto editorial independente de fã, em
// português, com fatos verificados (fontes em docs/conteudo/fontes-diario.md), SEM citações inventadas e sem sugerir
// vínculo oficial com pilotos ou equipes. Fotos: as editoriais e de piloto do site (PLACEHOLDERS, licenciar antes da
// venda; ver CLAUDE.md).
export type ArticleImage = { src: string; alt: string; position?: string; caption?: string };

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "image"; image: ArticleImage };

export type Article = {
  slug: string;
  title: string;
  /** Linha fina (subtítulo) do índice e do topo do artigo. */
  dek: string;
  /** ISO (AAAA-MM-DD). */
  date: string;
  cover: ArticleImage;
  body: ArticleBlock[];
  /** Produtos relacionados no fim: filtro do catálogo (piloto/equipe) ou lista de slugs. */
  related: { driver?: string; team?: string; slugs?: string[] };
};
