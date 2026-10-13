import type { Logo } from "@/components/ui/logo-marquee";

// Logo: coloque o arquivo em /public/images/logos-equipes/ (fundo transparente) e preencha src, width/height
// (do arquivo), crop (área do desenho, se o arquivo tiver margem transparente) e displayHeight (altura óptica).
// Sem src, o nome aparece em texto.
export const f1Teams: Logo[] = [
  { alt: "Ferrari", src: "/images/logos-equipes/Ferrari.webp", width: 493, height: 618, crop: [111, 279, 271, 59], displayHeight: 20 },
  { alt: "Mercedes", src: "/images/logos-equipes/mercedes.png", width: 2790, height: 1181, crop: [444, 293, 1905, 592], displayHeight: 26 },
  // mclaren.jpg tem fundo branco sólido (vira um bloco preto em monocromático): segue em texto até ter PNG/SVG transparente.
  { alt: "McLaren" },
  { alt: "Red Bull Racing", src: "/images/logos-equipes/red-bull.webp", width: 750, height: 750, crop: [38, 320, 674, 110], displayHeight: 18 },
  { alt: "Aston Martin" },
  { alt: "Williams" },
  { alt: "Alpine" },
  { alt: "Haas" },
  { alt: "Racing Bulls" },
  { alt: "Audi", src: "/images/logos-equipes/audi.webp", width: 1280, height: 1222, crop: [258, 258, 764, 705], displayHeight: 40 },
  { alt: "Cadillac" },
];
