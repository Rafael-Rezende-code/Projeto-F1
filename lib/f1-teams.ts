import type { Logo } from "@/components/ui/logo-marquee";

// Logo: arquivo recortado (sem margem transparente), com fundo transparente, em /public/images/logos-equipes/,
// nome em minúsculas e altura de ~3× o displayHeight. Preencha src, width/height (do arquivo) e displayHeight
// (altura óptica no desktop; no celular, 75%). Originais em /assets/logos-equipes-originais/ (fora do deploy).
// Alturas equilibradas a olho para o mesmo "peso" visual: wordmarks largos e finos (Red Bull, Ferrari) mais
// baixos; lockups compactos de várias linhas (Williams, Audi, Aston Martin, Cadillac) mais altos.
// Sem src, o nome aparece em texto.
export const f1Teams: Logo[] = [
  { alt: "Ferrari", src: "/images/logos-equipes/ferrari.webp", width: 271, height: 59, displayHeight: 25 },
  { alt: "Mercedes", src: "/images/logos-equipes/mercedes.webp", width: 348, height: 108, displayHeight: 36 },
  { alt: "McLaren", src: "/images/logos-equipes/mclaren.webp", width: 375, height: 96, displayHeight: 32 },
  { alt: "Red Bull Racing", src: "/images/logos-equipes/red-bull.webp", width: 423, height: 69, displayHeight: 23 },
  { alt: "Aston Martin", src: "/images/logos-equipes/aston-martin.webp", width: 201, height: 135, displayHeight: 45 },
  { alt: "Williams", src: "/images/logos-equipes/williams.webp", width: 292, height: 150, displayHeight: 50 },
  { alt: "Alpine", src: "/images/logos-equipes/alpine.webp", width: 162, height: 132, displayHeight: 44 },
  { alt: "Haas", src: "/images/logos-equipes/haas.webp", width: 301, height: 99, displayHeight: 33 },
  { alt: "Racing Bulls", src: "/images/logos-equipes/racing-bulls.webp", width: 152, height: 126, displayHeight: 42 },
  { alt: "Audi", src: "/images/logos-equipes/audi.webp", width: 163, height: 150, displayHeight: 50 },
  { alt: "Cadillac", src: "/images/logos-equipes/cadillac.webp", width: 266, height: 135, displayHeight: 45 },
];
