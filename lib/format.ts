// Formatação de preços: valores guardados em centavos (inteiro), exibidos em BRL no padrão pt-BR.
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(cents: number) {
  // Intl usa espaço não separável entre "R$" e o número; mantemos (evita quebra de linha no meio do preço).
  return brl.format(cents / 100);
}

/** Desconto em % (inteiro) entre o preço "de" e o "por". */
export function discountPercent(priceCents: number, compareAtCents?: number) {
  if (!compareAtCents || compareAtCents <= priceCents) return 0;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
