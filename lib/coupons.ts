// Cupons (operação, fase 1c): partes puras compartilhadas por servidor e navegador (testes em coupons.test.ts).
// QUEM DECIDE É O BANCO: o cupom é validado e o uso contado dentro da create_order (supabase/migrations/
// 20261026000000_cupons.sql). Aqui ficam o formato do código, as mensagens e o cálculo da PRÉVIA (mesma regra do SQL).

export type CouponKind = "percentual" | "valor_fixo" | "frete_gratis";
export type CouponReason = "inexistente" | "inativo" | "ainda_nao_comecou" | "expirado" | "minimo" | "esgotado" | "formato" | "desligado";

export const COUPON_STORAGE_KEY = "apex:cupom:v1";

/** Código digitado → formato aceito (sem espaços, letras/números/-/_; 3 a 40). null = inválido. */
export function normalizeCouponCode(value: string) {
  const code = value.trim().replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : null;
}

export const COUPON_MESSAGES: Record<CouponReason, string> = {
  inexistente: "Cupom não encontrado. Confira o código.",
  inativo: "Este cupom não está ativo.",
  ainda_nao_comecou: "Este cupom ainda não começou a valer.",
  expirado: "Este cupom expirou.",
  minimo: "O valor da compra ainda não atinge o mínimo deste cupom.",
  esgotado: "Este cupom já foi usado o máximo de vezes.",
  formato: "Use só letras, números, - ou _ (de 3 a 40 caracteres).",
  desligado: "Cupons não estão disponíveis no momento.",
};

export const couponMessage = (reason: string | undefined) => COUPON_MESSAGES[(reason ?? "inexistente") as CouponReason] ?? COUPON_MESSAGES.inexistente;

/** Mesma conta da função SQL coupon_evaluate (desconto nos itens nunca passa do subtotal; frete grátis zera o frete). */
export function computeCouponDiscount(coupon: { kind: CouponKind; value: number }, subtotalCents: number, shippingCents = 0) {
  let discount = 0;
  let shipping = 0;
  if (coupon.kind === "percentual") discount = Math.floor((subtotalCents * coupon.value) / 100);
  else if (coupon.kind === "valor_fixo") discount = coupon.value;
  else shipping = Math.max(shippingCents, 0);
  return { discountCents: Math.min(Math.max(discount, 0), subtotalCents), shippingDiscountCents: shipping };
}

/** Texto curto do benefício (admin e mensagens). */
export function couponBenefit(coupon: { kind: CouponKind; value: number }, format: (cents: number) => string) {
  if (coupon.kind === "percentual") return `${coupon.value}% de desconto`;
  if (coupon.kind === "valor_fixo") return `${format(coupon.value)} de desconto`;
  return "Frete grátis";
}

/** Situação para o painel: Desativado | Expirado | Agendado | Esgotado | Valendo. */
export function couponSituation(row: { active: boolean; starts_at: string | null; ends_at: string | null; max_uses: number | null; uses: number }, now: number) {
  if (!row.active) return "Desativado";
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return "Expirado";
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "Agendado";
  if (row.max_uses && row.uses >= row.max_uses) return "Esgotado";
  return "Valendo";
}
