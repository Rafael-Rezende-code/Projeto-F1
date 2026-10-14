import type { Team } from "../types";
import { teams as identities } from "@/lib/teams";

// A identidade visual das equipes (cores, logo) vive em lib/teams.ts; o catálogo só a expõe no formato do tipo Team.
export const teams: Team[] = identities.map((team) => ({
  slug: team.slug,
  name: team.name,
  tagline: team.tagline,
  color: team.color,
  brandColor: team.brandColor,
  logo: {
    src: team.logo.src ?? "",
    width: team.logo.width ?? 0,
    height: team.logo.height ?? 0,
    displayHeight: team.logo.displayHeight ?? 32,
  },
}));
