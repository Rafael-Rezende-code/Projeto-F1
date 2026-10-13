import type { Logo } from "@/components/ui/logo-marquee";

// Logo: arquivo recortado (sem margem transparente), com fundo transparente, em /public/images/logos-equipes/,
// nome em minúsculas e altura de ~3× o displayHeight. Preencha src, width/height (do arquivo) e displayHeight
// (altura óptica no desktop). Originais em /assets/logos-equipes-originais/ (fora do deploy).
// Sem src, o nome aparece em texto.
export const f1Teams: Logo[] = [
  { alt: "Ferrari", src: "/images/logos-equipes/ferrari.webp", width: 276, height: 60, displayHeight: 20 },
  { alt: "Mercedes", src: "/images/logos-equipes/mercedes.webp", width: 251, height: 78, displayHeight: 26 },
  // mclaren.jpg tem fundo branco sólido (vira um bloco preto em monocromático): segue em texto até chegar o SVG/PNG transparente.
  { alt: "McLaren" },
  { alt: "Red Bull Racing", src: "/images/logos-equipes/red-bull.webp", width: 331, height: 54, displayHeight: 18 },
  { alt: "Aston Martin" },
  { alt: "Williams" },
  { alt: "Alpine" },
  { alt: "Haas" },
  { alt: "Racing Bulls" },
  { alt: "Audi", src: "/images/logos-equipes/audi.webp", width: 130, height: 120, displayHeight: 40 },
  { alt: "Cadillac" },
];
