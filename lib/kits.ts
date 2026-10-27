// Kits "dia de corrida" (loja extra, item 2). Com Supabase, a tabela `kits` manda (painel /admin/kits); sem ela, valem
// os kits locais abaixo (um por piloto: camiseta + boné + pôster, três categorias diferentes, 10%). O desconto que vale
// é o calculado no servidor (create_order / lib/pricing.ts); estes dados também alimentam a prévia da sacola.
import type { KitRule } from "@/lib/pricing";

export type Kit = KitRule & { teamSlug?: string | null; driverSlug?: string | null };

const driverKit = (driverSlug: string, teamSlug: string, name: string): Kit => ({
  slug: `kit-${driverSlug}`,
  title: `Kit dia de corrida ${name}`,
  teamSlug,
  driverSlug,
  productSlugs: [`camiseta-${driverSlug}`, `bone-${driverSlug}`, `poster-${driverSlug}`],
  percent: 10,
  active: true,
});

export const LOCAL_KITS: Kit[] = [
  driverKit("norris", "mclaren", "Norris"),
  driverKit("verstappen", "red-bull-racing", "Verstappen"),
  driverKit("hamilton", "ferrari", "Hamilton"),
  driverKit("bortoleto", "audi", "Bortoleto"),
];

/** Kit da página: o do piloto; na equipe, o da equipe (ou o primeiro de um piloto dela). */
export function kitFor(kits: Kit[], target: { driverSlug?: string; teamSlug?: string }) {
  const active = kits.filter((kit) => kit.active !== false);
  if (target.driverSlug) return active.find((kit) => kit.driverSlug === target.driverSlug) ?? null;
  if (target.teamSlug) return active.find((kit) => kit.teamSlug === target.teamSlug && !kit.driverSlug) ?? active.find((kit) => kit.teamSlug === target.teamSlug) ?? null;
  return null;
}

/** Preço do kit para um conjunto: soma, desconto (mesmo arredondamento do banco) e preço final. */
export function kitPrice(prices: number[], percent: number) {
  const sumCents = prices.reduce((sum, price) => sum + price, 0);
  const discountCents = Math.round((sumCents * percent) / 100);
  return { sumCents, discountCents, totalCents: sumCents - discountCents };
}

type KitRow = { slug: string; title: string; team_slug: string | null; driver_slug: string | null; product_slugs: string[]; discount_percent: number; active: boolean };
export const kitFromRow = (row: KitRow): Kit => ({
  slug: row.slug,
  title: row.title,
  teamSlug: row.team_slug,
  driverSlug: row.driver_slug,
  productSlugs: row.product_slugs,
  percent: row.discount_percent,
  active: row.active,
});
