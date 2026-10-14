import type { ArtSource } from "@/components/ui/art-directed-image";

// Fotos editoriais das seções da home (next/image, qualidade 90).
// PLACEHOLDERS: precisam de licenciamento antes da venda (ver CLAUDE.md).
//
// DIREÇÃO DE ARTE POR BREAKPOINT (um único lugar):
// - `mobile` = foto vertical (1170px) para celular e tablet (até 1023px).
// - `desktop` = foto horizontal para telas ≥ 1024px.
// Para trocar a foto do desktop, basta colocar o arquivo horizontal em public/images/editorial/ e mudar o
// `src` do `desktop` abaixo (convenção: <nome>-desktop.jpg ou .png, em minúsculas). Para remover a versão
// de desktop e usar a vertical em todas as telas, apague a linha `desktop`.
// O navegador baixa só a versão do breakpoint atual (<picture>), nunca as duas.
export type EditorialPhoto = {
  alt: string;
  mobile: ArtSource;
  desktop?: ArtSource;
};

export const editorialQuality = 90;

export const editorial = {
  // "A cultura da velocidade / Mais que uma corrida." (#story), largura total.
  story: {
    alt: "Pilotos da Red Bull e da Ferrari se abraçam depois da corrida",
    // 1170×1424: no celular a foto cobre a seção; ×1,5 de sobreamostragem (mesma regra dos cards de pilotos).
    mobile: { src: "/images/editorial/abraco-redbull-ferrari.jpeg", position: "50% 22%", sizes: "150vw" },
    // 1672×941, largura total (100vw).
    desktop: { src: "/images/editorial/abraco-redbull-ferrari-desktop.png", position: "50% 30%", sizes: "100vw" },
  },
  // "Obsessão projetada / Cada detalhe importa.": metade da largura no desktop, largura total no celular.
  // Só versão vertical: no desktop (720×620 px) a foto é reduzida, não ampliada (0,62×) em DPR 1.
  detail: {
    alt: "Ayrton Senna deitado sobre uma pilha de pneus Goodyear, com o capacete ao lado",
    mobile: { src: "/images/editorial/senna-pneus.jpeg", position: "50% 40%", sizes: "(min-width: 1024px) 75vw, 150vw" },
  },
  // "A corrida noturna / Luzes apagadas." (#journal), largura total.
  journal: {
    alt: "Max Verstappen de capacete, com o macacão da Red Bull",
    mobile: { src: "/images/editorial/verstappen-capacete.jpeg", position: "50% 15%", sizes: "150vw" },
    desktop: { src: "/images/editorial/verstappen-capacete-desktop.png", position: "50% 8%", sizes: "100vw" },
  },
} satisfies Record<string, EditorialPhoto>;
