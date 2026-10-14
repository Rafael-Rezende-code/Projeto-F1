// Fotos editoriais das seções da home (next/image, qualidade 90).
// PLACEHOLDERS: precisam de licenciamento antes da venda (ver CLAUDE.md).
// Originais de 1170px de largura, em retrato: nas seções de largura total o navegador amplia a foto.
export type EditorialPhoto = {
  src: string;
  alt: string;
  /** object-position: enquadramento da foto na área da seção. */
  position: string;
  /** Largura real da área × 1,5 (mesma sobreamostragem dos cards de pilotos). */
  sizes: string;
};

export const editorialQuality = 90;

export const editorial = {
  // "A cultura da velocidade / Mais que uma corrida." (#story), largura total.
  story: {
    src: "/images/editorial/abraco-redbull-ferrari.jpeg",
    alt: "Pilotos da Red Bull e da Ferrari se abraçam depois da corrida",
    position: "50% 22%",
    sizes: "150vw",
  },
  // "Obsessão projetada / Cada detalhe importa.": metade da largura no desktop, largura total no celular.
  detail: {
    src: "/images/editorial/senna-pneus.jpeg",
    alt: "Ayrton Senna deitado sobre uma pilha de pneus Goodyear, com o capacete ao lado",
    position: "50% 40%",
    sizes: "(min-width: 1024px) 75vw, 150vw",
  },
  // "A corrida noturna / Luzes apagadas." (#journal), largura total.
  journal: {
    src: "/images/editorial/verstappen-capacete.jpeg",
    alt: "Max Verstappen de capacete, com o macacão da Red Bull",
    position: "50% 15%",
    sizes: "150vw",
  },
} satisfies Record<string, EditorialPhoto>;
