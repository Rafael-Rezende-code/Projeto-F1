import { IMG } from "@/lib/catalog/seed/images";

// Coleções (refino 3, item 1.4): landings editoriais em /colecoes/[slug]. Cada uma junta produtos por CATEGORIA e/ou
// TAG (basta casar uma das duas) e, opcionalmente, por faixa de preço (as duas pontas valem). Regras em
// lib/catalog/collections.ts. A home, o menu e o sitemap só mostram coleções com pelo menos 1 produto publicado; a
// página de uma coleção vazia mostra "Em breve" (com link para a newsletter).
//
// Para criar uma coleção: acrescente aqui (slug único, capa com licença conferida) e marque os produtos com a tag no
// painel (ou no CSV). Não invente produto para preencher coleção.

export type CollectionFilters = {
  /** Slugs de categoria (lib/catalog/seed/categories.ts ou tabela categories). */
  categories?: string[];
  /** Tags dos produtos (minúsculas, sem acento). */
  tags?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
};

export type Collection = {
  slug: string;
  title: string;
  /** Frase curta (cards, menu e cabeçalho). */
  phrase: string;
  /** Texto curto da landing (1 parágrafo). */
  intro: string;
  cover: { src: string; alt: string; position?: string };
  filters: CollectionFilters;
};

export const collections: Collection[] = [
  {
    slug: "camisetas",
    title: "Camisetas",
    phrase: "Do paddock para o dia a dia.",
    intro: "Camisetas de torcedor das equipes e dos pilotos do grid, mais as peças da casa inspiradas nos circuitos. Algodão, estampa e a cor de quem você acompanha.",
    cover: { src: IMG.tee, alt: "Camiseta dobrada sobre fundo claro" },
    filters: { tags: ["camiseta"] },
  },
  {
    slug: "miniaturas",
    title: "Miniaturas",
    phrase: "O grid em escala.",
    intro: "Capacetes e carros em miniatura para a estante: peças de coleção, muitas importadas e sob encomenda, com o prazo informado em cada uma.",
    cover: { src: IMG.collectibles, alt: "Peças colecionáveis de automobilismo" },
    filters: { tags: ["miniatura"] },
  },
  {
    slug: "colecionaveis",
    title: "Colecionáveis",
    phrase: "Guarde a memória.",
    intro: "Miniaturas, pôsteres e objetos para quem guarda cada temporada. O que fica depois que a bandeira quadriculada baixa.",
    cover: { src: "/images/editorial/senna-pneus.jpeg", alt: "Piloto entre pneus no box", position: "50% 30%" },
    filters: { categories: ["colecionaveis"], tags: ["colecionavel"] },
  },
  {
    slug: "pistas-3d",
    title: "Pistas 3D",
    phrase: "O traçado na palma da mão.",
    intro: "Circuitos impressos em 3D, com cada curva e cada reta no lugar. Para a mesa de trabalho ou a parede de quem sabe cada ponto de frenagem.",
    cover: { src: IMG.racing, alt: "Carro de Fórmula 1 na pista" },
    filters: { tags: ["pista-3d"] },
  },
  {
    slug: "canecas",
    title: "Canecas",
    phrase: "O café antes da largada.",
    intro: "Canecas com as cores e os números do grid para o café da classificação de madrugada.",
    cover: { src: IMG.accessories, alt: "Acessórios de automobilismo" },
    filters: { tags: ["caneca"] },
  },
  {
    slug: "acessorios",
    title: "Acessórios",
    phrase: "Leve o grid com você.",
    intro: "Bonés das equipes e dos pilotos, bolsas e os detalhes que completam o look do dia de prova.",
    cover: { src: IMG.cap, alt: "Boné de equipe de Fórmula 1" },
    filters: { categories: ["acessorios"], tags: ["acessorio"] },
  },
];

export const getCollection = (slug: string) => collections.find((collection) => collection.slug === slug) ?? null;
