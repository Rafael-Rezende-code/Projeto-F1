import { clark } from "./clark";
import { fangio } from "./fangio";
import { fittipaldi } from "./fittipaldi";
import { lauda } from "./lauda";
import { piquet } from "./piquet";
import { prost } from "./prost";
import { schumacher } from "./schumacher";
import { senna } from "./senna";
import type { Legend } from "./types";

export type { Legend } from "./types";

// Ordem do hub: os brasileiros primeiro, depois os demais.
export const legends: Legend[] = [senna, fittipaldi, piquet, schumacher, prost, lauda, fangio, clark];
export const getLegend = (slug: string) => legends.find((legend) => legend.slug === slug) ?? null;
/** Tag do catálogo dos produtos de cada lenda (ex.: "lenda-senna"). */
export const legendTag = (slug: string) => `lenda-${slug}`;
