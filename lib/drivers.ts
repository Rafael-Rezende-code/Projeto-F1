import type { HoverTransitionDirection, HoverTransitionEffect } from "@/components/ui/hover-transition";

export type Driver = {
  slug: string;
  name: string;
  team: string;
  /** Cor da equipe: fundo que varre o card no hover/foco. */
  color: string;
  /** Cor do texto sobre a cor da equipe. */
  textColor: string;
  /** Detalhe opcional (fio, rótulo da equipe e "Ver coleção"). Sem ele, usa textColor. */
  accent?: string;
  phrase: string;
  image: string;
  /**
   * Foto do cabeçalho da página do piloto (/pilotos/[slug]), SEM extensão, relativa a /public. Se existir
   * public{pagePhoto}.jpg, .png ou .webp (nessa ordem), ela é usada; senão, a foto do card (`image`).
   * Detectado no build (lib/catalog/seed/drivers.ts): depois de adicionar o arquivo, gere o build/deploy de novo.
   */
  pagePhoto: string;
  /** object-position da foto no card 4:5, para enquadrar rosto e capacete. */
  imagePosition?: string;
  href: string;
  /** Efeito do HoverTransition e direção de entrada. */
  effect: HoverTransitionEffect;
  direction: HoverTransitionDirection;
  /** Duração própria em segundos. Sem ela, usa driverHoverTransition.duration. */
  duration?: number;
  /** Curva própria (CSS). Sem ela, usa driverHoverTransition.easing. */
  easing?: string;
};

// Transição compartilhada pelos cards: duração em segundos e curva ease-out expo.
export const driverHoverTransition = {
  duration: 0.5,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

// Ordem de exibição.
export const drivers: Driver[] = [
  {
    slug: "norris",
    name: "Lando Norris",
    team: "McLaren",
    color: "#FF8000",
    textColor: "#111111",
    phrase: "Papaya até a última volta.",
    image: "/images/pilotos/norris.jpeg",
    pagePhoto: "/images/pilotos/paginas/norris",
    imagePosition: "50% 30%",
    href: "/pilotos/norris",
    effect: "ripple",
    direction: "bottom-left",
  },
  {
    slug: "verstappen",
    name: "Max Verstappen",
    team: "Red Bull Racing",
    color: "#1B2A5C",
    textColor: "#FFFFFF",
    phrase: "Implacável, volta após volta.",
    image: "/images/pilotos/verstappen.png",
    pagePhoto: "/images/pilotos/paginas/verstappen",
    imagePosition: "50% 30%",
    href: "/pilotos/verstappen",
    effect: "strips",
    direction: "right",
  },
  {
    slug: "hamilton",
    name: "Lewis Hamilton",
    team: "Ferrari",
    color: "#DC0000",
    textColor: "#FFFFFF",
    phrase: "Uma lenda vestida de vermelho.",
    image: "/images/pilotos/hamilton.png",
    pagePhoto: "/images/pilotos/paginas/hamilton",
    imagePosition: "50% 30%",
    href: "/pilotos/hamilton",
    effect: "curtain",
    direction: "right",
    // Cortina de palco: começa devagar e abre com peso. Com esta curva, a cortina fica toda aberta na
    // metade da duração (~0,48 s); com 0,85 s ficava no limite de 0,4 s.
    duration: 0.95,
    easing: "cubic-bezier(0.65, 0, 0.35, 1)",
  },
  {
    slug: "bortoleto",
    name: "Gabriel Bortoleto",
    team: "Audi",
    color: "#0B0B0B",
    textColor: "#FFFFFF",
    accent: "#A7A9AC",
    phrase: "O Brasil de volta ao grid.",
    image: "/images/pilotos/bortoleto.png",
    pagePhoto: "/images/pilotos/paginas/bortoleto",
    imagePosition: "50% 30%",
    href: "/pilotos/bortoleto",
    effect: "wipe",
    direction: "bottom",
  },
];
