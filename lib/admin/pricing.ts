// Calculadora de preço do painel (refino 2, item 6). Função pura (testes em pricing.test.ts). Tudo em CENTAVOS; as
// porcentagens em pontos percentuais (4,99 = 4,99%).
//
//   custo total   = custo do produto + frete do fornecedor + taxa fixa do pagamento
//   preço sugerido = custo total / (1 − taxa % − impostos % − margem desejada %)
//   margem líquida = preço − custo − frete do fornecedor − preço × (taxa % + impostos %) − taxa fixa
//
// A margem é sobre o PREÇO (não markup sobre o custo). Arredonda o sugerido para cima, terminando em ,90.

export type PricingParams = {
  /** Taxa do meio de pagamento, em % do preço (ex.: cartão no Mercado Pago). */
  feePercent: number;
  /** Taxa fixa por venda, em centavos. */
  feeFixedCents: number;
  /** Impostos sobre a venda, em % (ex.: Simples Nacional). */
  taxPercent: number;
  /** Margem líquida desejada, em % do preço. */
  marginPercent: number;
};

/** Parâmetros iniciais: EXEMPLO, conferir com o contrato do provedor e com o contador. Editáveis no painel. */
export const DEFAULT_PRICING: PricingParams = { feePercent: 4.99, feeFixedCents: 0, taxPercent: 0, marginPercent: 35 };

export type PricingInput = { costCents: number; supplierShippingCents: number };

/** Margem líquida de um preço (centavos e % do preço). */
export function netMargin(priceCents: number, input: PricingInput, params: PricingParams) {
  const variable = Math.round((priceCents * (params.feePercent + params.taxPercent)) / 100);
  const cents = priceCents - input.costCents - input.supplierShippingCents - variable - params.feeFixedCents;
  return { cents, percent: priceCents > 0 ? (cents / priceCents) * 100 : 0, feesCents: variable + params.feeFixedCents };
}

/** Preço sugerido para atingir a margem desejada; null se as porcentagens somam 100% ou mais. */
export function suggestedPrice(input: PricingInput, params: PricingParams) {
  const share = 1 - (params.feePercent + params.taxPercent + params.marginPercent) / 100;
  if (share <= 0) return null;
  const raw = (input.costCents + input.supplierShippingCents + params.feeFixedCents) / share;
  return roundToNinety(raw);
}

/** Arredonda para cima até o próximo valor terminado em ,90 (ex.: 187,32 → 187,90; 187,95 → 188,90). */
export function roundToNinety(cents: number) {
  const reais = Math.floor(cents / 100);
  const candidate = reais * 100 + 90;
  return candidate >= Math.ceil(cents) ? candidate : candidate + 100;
}
