import type { HoverTransitionDirection, HoverTransitionEffect } from "@/components/ui/hover-transition";

export type DriverPhoto = {
  src: string;
  width: number;
  height: number;
  position: string;
  /** Enquadramento da versão de desktop opcional ({slug}-principal-desktop / -secundaria-desktop), se existir. */
  desktopPosition?: string;
};

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
   * Fotos da página do piloto (/pilotos/[slug]), em public/images/pilotos/paginas/. Largura e altura reais do arquivo
   * (decidem o layout do topo: vertical = dividido, horizontal = largura total) e o enquadramento (object-position).
   * principal: topo da página; secundária: bloco editorial do meio.
   * VERSÕES DE DESKTOP OPCIONAIS: se existir public/images/pilotos/paginas/{slug}-principal-desktop.(jpg|png|webp) ou
   * {slug}-secundaria-desktop.*, ela é usada a partir de 1024px (<picture>: cada aparelho baixa só uma). Basta colocar o
   * arquivo e rodar o build (ou `pnpm images:blur`); a orientação dela decide o layout do topo no desktop.
   */
  photoMain: DriverPhoto;
  photoSecondary: DriverPhoto;
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
    photoMain: { src: "/images/pilotos/paginas/norris-principal.jpg", width: 1170, height: 1425, position: "50% 22%" },
    photoSecondary: { src: "/images/pilotos/paginas/norris-secundaria.jpg", width: 1169, height: 1586, position: "50% 35%" },
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
    photoMain: { src: "/images/pilotos/paginas/verstappen-principal.jpg", width: 1170, height: 1446, position: "50% 18%" },
    photoSecondary: { src: "/images/pilotos/paginas/verstappen-secundaria.jpg", width: 1170, height: 1452, position: "50% 45%" },
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
    photoMain: { src: "/images/pilotos/paginas/hamilton-principal.jpg", width: 1169, height: 1435, position: "50% 40%" },
    photoSecondary: { src: "/images/pilotos/paginas/hamilton-secundaria.jpg", width: 1170, height: 1470, position: "50% 25%" },
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
    photoMain: { src: "/images/pilotos/paginas/bortoleto-principal.jpg", width: 1169, height: 1433, position: "50% 30%" },
    photoSecondary: { src: "/images/pilotos/paginas/bortoleto-secundaria.jpg", width: 1170, height: 1553, position: "50% 40%" },
    imagePosition: "50% 30%",
    href: "/pilotos/bortoleto",
    effect: "wipe",
    direction: "bottom",
  },
];
