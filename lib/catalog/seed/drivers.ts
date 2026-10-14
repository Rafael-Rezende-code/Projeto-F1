import type { Driver } from "../types";
import { drivers as cards } from "@/lib/drivers";

// Equipe de cada piloto (slug de lib/teams.ts). Fotos e frases vêm dos cards da home (lib/drivers.ts).
const teamOf: Record<string, string> = {
  norris: "mclaren",
  verstappen: "red-bull-racing",
  hamilton: "ferrari",
  bortoleto: "audi",
};

export const drivers: Driver[] = cards.map((card) => ({
  slug: card.slug,
  name: card.name,
  teamSlug: teamOf[card.slug],
  phrase: card.phrase,
  image: card.image,
  imagePosition: card.imagePosition,
}));
