// REGRAS DE PREÇO do pedido (loja extra): kit, cupom, desconto no Pix e adicional de personalização. Puras e testadas
// (pricing.test.ts). O MESMO cálculo existe em SQL na create_order (supabase/migrations): no pedido gravado o banco é quem
// decide; aqui ele serve para o pedido simulado e para as prévias (sacola, checkout, página do produto).
//
// Ordem: itens (preço + adicional de personalização) → desconto de kit → cupom (sobre o que sobrou; não cumulativo com
// kit por padrão) → desconto no Pix (sobre itens − kit − cupom, SEM o frete) → frete (menos o frete grátis do cupom).
// Arredondamento: Math.round em centavos (o SQL usa round()).

export type PriceLine = {
  /** Identidade do item na sacola: SKU + personalização. */
  key: string;
  sku: string;
  slug: string;
  unitPriceCents: number;
  /** Adicional de personalização por unidade (0 sem personalização). */
  feeCents: number;
  quantity: number;
  personalized: boolean;
};

export type KitRule = { slug: string; title: string; productSlugs: string[]; percent: number; active?: boolean };
export type AppliedKit = { slug: string; title: string; sets: number; discountCents: number; lineKeys: string[] };

/**
 * Kits completos na sacola. Um kit vale para cada CONJUNTO com todos os seus produtos (qualquer tamanho), sem itens
 * personalizados. Cada unidade entra em um kit só; os kits de maior desconto por conjunto são avaliados primeiro.
 * O desconto é o percentual do kit sobre o preço (sem adicional) de uma unidade de cada produto do conjunto.
 */
export function applyKits(lines: PriceLine[], kits: KitRule[]): AppliedKit[] {
  const free = new Map(lines.filter((line) => !line.personalized).map((line) => [line.key, line.quantity]));
  const priceOf = (slug: string) => lines.find((line) => line.slug === slug && !line.personalized)?.unitPriceCents ?? 0;
  const setValue = (kit: KitRule) => kit.productSlugs.reduce((sum, slug) => sum + priceOf(slug), 0);
  const candidates = kits
    .filter((kit) => kit.active !== false && kit.percent > 0 && kit.productSlugs.length >= 2 && new Set(kit.productSlugs).size === kit.productSlugs.length)
    .sort((a, b) => Math.round((setValue(b) * b.percent) / 100) - Math.round((setValue(a) * a.percent) / 100) || a.slug.localeCompare(b.slug));
  const applied: AppliedKit[] = [];
  for (const kit of candidates) {
    const available = (slug: string) => lines.filter((line) => line.slug === slug && !line.personalized).reduce((sum, line) => sum + (free.get(line.key) ?? 0), 0);
    const sets = Math.min(...kit.productSlugs.map(available));
    if (!Number.isFinite(sets) || sets <= 0) continue;
    const keys: string[] = [];
    for (const slug of kit.productSlugs) {
      let need = sets;
      for (const line of lines.filter((item) => item.slug === slug && !item.personalized)) {
        const take = Math.min(need, free.get(line.key) ?? 0);
        if (take > 0) {
          free.set(line.key, (free.get(line.key) ?? 0) - take);
          keys.push(line.key);
          need -= take;
        }
        if (need === 0) break;
      }
    }
    applied.push({ slug: kit.slug, title: kit.title, sets, discountCents: Math.round((setValue(kit) * kit.percent) / 100) * sets, lineKeys: keys });
  }
  return applied;
}

export const pixDiscountFor = (baseCents: number, percent: number) => (percent > 0 ? Math.round((Math.max(0, baseCents) * percent) / 100) : 0);

export type Totals = {
  itemsCents: number;
  feesCents: number;
  kits: AppliedKit[];
  kitDiscountCents: number;
  couponDiscountCents: number;
  pixDiscountCents: number;
  shippingCents: number;
  totalCents: number;
  /** Cupom recusado por não ser cumulativo com kit. */
  couponBlockedByKit: boolean;
};

export function computeTotals(input: {
  lines: PriceLine[];
  kits?: KitRule[];
  /** Desconto do cupom já avaliado (no servidor) sobre o subtotal depois do kit. */
  coupon?: { discountCents: number; shippingDiscountCents: number } | null;
  /** Cupom e kit juntos? Padrão: não (lib/store-policy.ts). */
  couponWithKit?: boolean;
  shippingCents?: number;
  method?: string;
  pixPercent?: number;
}): Totals {
  const itemsCents = input.lines.reduce((sum, line) => sum + (line.unitPriceCents + line.feeCents) * line.quantity, 0);
  const feesCents = input.lines.reduce((sum, line) => sum + line.feeCents * line.quantity, 0);
  const kits = applyKits(input.lines, input.kits ?? []);
  const kitDiscountCents = kits.reduce((sum, kit) => sum + kit.discountCents, 0);
  const couponBlockedByKit = Boolean(input.coupon && kitDiscountCents > 0 && !input.couponWithKit);
  const coupon = couponBlockedByKit ? null : input.coupon;
  const afterKit = itemsCents - kitDiscountCents;
  const couponDiscountCents = Math.min(coupon?.discountCents ?? 0, afterKit);
  const shipping = input.shippingCents ?? 0;
  const shippingDiscount = Math.min(coupon?.shippingDiscountCents ?? 0, shipping);
  const pixDiscountCents = input.method === "pix" ? pixDiscountFor(afterKit - couponDiscountCents, input.pixPercent ?? 0) : 0;
  const shippingCents = shipping - shippingDiscount;
  return {
    itemsCents,
    feesCents,
    kits,
    kitDiscountCents,
    couponDiscountCents,
    pixDiscountCents,
    shippingCents,
    totalCents: afterKit - couponDiscountCents - pixDiscountCents + shippingCents,
    couponBlockedByKit,
  };
}
