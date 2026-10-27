// Hub "Lendas" (loja extra, item 7): homenagem de fãs a pilotos históricos. Regras do texto: português, fatos estáveis
// e verificados (fontes por fato em docs/conteudo/fontes-lendas.md), SEM citações atribuídas e sem estatísticas que
// mudam. Sem fotos de terceiros: só Senna usa as fotos que o projeto já tem; os outros, fundo gráfico em código.
export type Legend = {
  slug: string;
  name: string;
  /** Nome curto para o título grande (ex.: "Senna"). */
  shortName: string;
  country: string;
  /** Anos na Fórmula 1 (ex.: "1984–1994"). */
  years: string;
  /** Cor de destaque do fundo gráfico (não é marca nem capacete: só um tom). */
  color: string;
  /** Linha de abertura. */
  opening: string;
  /** Trajetória em 2 a 3 parágrafos. */
  trajectory: string[];
  /** 3 a 5 marcos estáveis (número ou ano + texto). */
  milestones: { value: string; label: string }[];
  /** 3 curiosidades. */
  curiosities: string[];
  /** Foto do próprio projeto (só quando existe e pode ser usada; hoje, só Senna). */
  photo?: { src: string; alt: string; position?: string };
  /** Artigos do Diário relacionados (slugs). */
  articles?: string[];
  born: string;
  died?: string;
};
