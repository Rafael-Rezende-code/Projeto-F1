import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Driver } from "../types";
import { drivers as cards } from "@/lib/drivers";

// Equipe de cada piloto (slug de lib/teams.ts). Fotos e frases vêm dos cards da home (lib/drivers.ts).
const teamOf: Record<string, string> = {
  norris: "mclaren",
  verstappen: "red-bull-racing",
  hamilton: "ferrari",
  bortoleto: "audi",
};

// Usa a foto própria da página do piloto se o arquivo existir em public/ (jpg, png ou webp); senão, a do card.
function pageImage(base: string, fallback: string) {
  for (const ext of ["jpg", "png", "webp"]) {
    if (existsSync(join(process.cwd(), "public", `${base}.${ext}`))) return `${base}.${ext}`;
  }
  return fallback;
}

export const drivers: Driver[] = cards.map((card) => ({
  slug: card.slug,
  name: card.name,
  teamSlug: teamOf[card.slug],
  phrase: card.phrase,
  image: card.image,
  imagePosition: card.imagePosition,
  pageImage: pageImage(card.pagePhoto, card.image),
}));
