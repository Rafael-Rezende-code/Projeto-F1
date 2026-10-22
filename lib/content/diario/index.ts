import { aCulturaDoDiaDeProva } from "./a-cultura-do-dia-de-prova";
import { oBrasilDeVoltaAoGrid } from "./o-brasil-de-volta-ao-grid";
import { sennaEAMcLaren } from "./senna-e-a-mclaren";
import type { Article } from "./types";

export type { Article, ArticleBlock, ArticleImage } from "./types";

/** Artigos do Diário, do mais recente para o mais antigo. */
export const articles: Article[] = [sennaEAMcLaren, oBrasilDeVoltaAoGrid, aCulturaDoDiaDeProva].sort((a, b) => b.date.localeCompare(a.date));

export const getArticle = (slug: string) => articles.find((article) => article.slug === slug);

/** Palavras do artigo (título, linha fina e corpo). */
export const wordCount = (article: Article) =>
  [article.title, article.dek, ...article.body.map((block) => ("text" in block ? block.text : block.image.caption ?? ""))]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

/** Minutos de leitura (200 palavras por minuto, arredondado para cima). */
export const readingMinutes = (article: Article) => Math.max(1, Math.ceil(wordCount(article) / 200));
