import type { Driver } from "../types";
import { drivers as cards } from "@/lib/drivers";

// Equipe de cada piloto (slug de lib/teams.ts). Fotos e frases vêm dos cards da home (lib/drivers.ts).
const teamOf: Record<string, string> = {
  antonelli: "mercedes",
  norris: "mclaren",
  verstappen: "red-bull-racing",
  hamilton: "ferrari",
  bortoleto: "audi",
};

const toDriver = (card: (typeof cards)[number]): Driver => ({
  slug: card.slug,
  name: card.name,
  teamSlug: teamOf[card.slug],
  phrase: card.phrase,
  image: card.image,
  imagePosition: card.imagePosition,
  photoMain: card.photoMain,
  photoSecondary: card.photoSecondary,
  carImage: card.carImage,
  carFacing: card.carFacing,
});

/** Pilotos do seed e do banco (com produtos de exemplo). O campeão (champion em lib/drivers.ts) fica de fora: é só do código. */
export const drivers: Driver[] = cards.filter((card) => !card.champion).map(toDriver);

/** Pilotos só no código (Sessão do Campeão): não vão para o banco nem ganham produtos de exemplo; os repositórios os
 * acrescentam no início da lista (o campeão vem primeiro). Produtos dele entram pelo admin com a tag `antonelli`. */
export const codeOnlyDrivers: Driver[] = cards.filter((card) => card.champion).map(toDriver);

export const withCodeOnlyDrivers = (list: Driver[]): Driver[] => [...codeOnlyDrivers.filter((driver) => !list.some((item) => item.slug === driver.slug)), ...list];
