// POLÍTICA COMERCIAL da loja: a ÚNICA fonte das promessas ao cliente (parcelamento, frete grátis, trocas, garantia, envio,
// área de entrega). REGRA: nada aparece no site sem estar configurado aqui. Nenhum valor é escrito à mão no código: cada
// item vem de variável de ambiente (nomes em .env.example) e, SEM a variável, o item simplesmente não existe (a página
// não mostra o aviso, o carrinho não mostra a barra de frete grátis, o frete não sai grátis).
//
// Variáveis NEXT_PUBLIC_*: valem no navegador e são lidas no BUILD (mudou? novo deploy). Em Vercel → Settings →
// Environment Variables. Textos: escreva exatamente o que a loja se compromete a cumprir.
//
//   NEXT_PUBLIC_INSTALLMENTS_MAX              máximo de parcelas anunciadas na página do produto (ex.: 3)
//   NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE    "true" só se essas parcelas são SEM JUROS (sem isso, nada é anunciado)
//   NEXT_PUBLIC_INSTALLMENT_MIN_CENTS         valor mínimo de cada parcela em centavos (opcional; reduz o nº de parcelas)
//   NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS      frete grátis a partir deste subtotal, em centavos (ex.: 29900)
//   NEXT_PUBLIC_POLICY_SHIPPING_NOTE          frase sobre o envio (acordeão "Envio" da página do produto)
//   NEXT_PUBLIC_POLICY_RETURNS_NOTE           frase sobre trocas e devoluções (acordeão "Trocas e devoluções")
//   NEXT_PUBLIC_POLICY_WARRANTY_NOTE          frase sobre garantia (acordeão "Garantia")
//   NEXT_PUBLIC_POLICY_DELIVERY_AREA          onde a loja entrega, como frase (ex.: "Entregamos em todo o Brasil.", /sobre)
//   NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS    "true" SÓ quando a loja de fato envia e-mails do pedido (hoje não há serviço de e-mail:
//                                             sem a variável, a página do pedido não promete aviso por e-mail)
//
// "Oficial": o site NÃO afirma ser loja oficial de equipe ou piloto (há avisos do contrário em /sobre, nos textos
// editoriais e nas descrições); não existe configuração que mude isso.
// O parcelamento REAL do cartão é o do Mercado Pago (Payment Brick, no checkout): o que se anuncia aqui precisa ser o
// que a conta do Mercado Pago realmente oferece.

type Env = Record<string, string | undefined>;

const positiveInt = (value: string | undefined) => {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
};
const text = (value: string | undefined) => {
  const clean = String(value ?? "").trim();
  return clean ? clean : null;
};

export function createStorePolicy(env: Env) {
  return {
    installments: {
      max: positiveInt(env.NEXT_PUBLIC_INSTALLMENTS_MAX),
      interestFree: env.NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE === "true",
      minInstallmentCents: positiveInt(env.NEXT_PUBLIC_INSTALLMENT_MIN_CENTS),
    },
    /** null = não há frete grátis (nada é anunciado e nenhuma cotação sai grátis). */
    freeShippingFromCents: positiveInt(env.NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS),
    shippingNote: text(env.NEXT_PUBLIC_POLICY_SHIPPING_NOTE),
    returnsNote: text(env.NEXT_PUBLIC_POLICY_RETURNS_NOTE),
    warrantyNote: text(env.NEXT_PUBLIC_POLICY_WARRANTY_NOTE),
    deliveryArea: text(env.NEXT_PUBLIC_POLICY_DELIVERY_AREA),
    emailNotifications: env.NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS === "true",
  };
}
export type StorePolicy = ReturnType<typeof createStorePolicy>;

// As leituras de process.env.NEXT_PUBLIC_* precisam ser LITERAIS para o Next trocar o valor no código do navegador.
export const storePolicy: StorePolicy = createStorePolicy({
  NEXT_PUBLIC_INSTALLMENTS_MAX: process.env.NEXT_PUBLIC_INSTALLMENTS_MAX,
  NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE: process.env.NEXT_PUBLIC_INSTALLMENTS_INTEREST_FREE,
  NEXT_PUBLIC_INSTALLMENT_MIN_CENTS: process.env.NEXT_PUBLIC_INSTALLMENT_MIN_CENTS,
  NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS: process.env.NEXT_PUBLIC_FREE_SHIPPING_FROM_CENTS,
  NEXT_PUBLIC_POLICY_SHIPPING_NOTE: process.env.NEXT_PUBLIC_POLICY_SHIPPING_NOTE,
  NEXT_PUBLIC_POLICY_RETURNS_NOTE: process.env.NEXT_PUBLIC_POLICY_RETURNS_NOTE,
  NEXT_PUBLIC_POLICY_WARRANTY_NOTE: process.env.NEXT_PUBLIC_POLICY_WARRANTY_NOTE,
  NEXT_PUBLIC_POLICY_DELIVERY_AREA: process.env.NEXT_PUBLIC_POLICY_DELIVERY_AREA,
  NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS: process.env.NEXT_PUBLIC_POLICY_EMAIL_NOTIFICATIONS,
});

/**
 * Parcelamento anunciado para um preço: "ou {count}x de {amountCents} sem juros". null quando não há configuração, quando
 * as parcelas não são sem juros (o valor da parcela com juros depende do cartão, não dá para anunciar) ou quando o preço
 * é baixo demais para duas parcelas.
 */
export function installmentOffer(priceCents: number, policy: StorePolicy = storePolicy) {
  const { max, interestFree, minInstallmentCents } = policy.installments;
  if (!max || max < 2 || !interestFree) return null;
  const byMinimum = minInstallmentCents ? Math.floor(priceCents / minInstallmentCents) : max;
  const count = Math.min(max, byMinimum);
  if (count < 2) return null;
  return { count, amountCents: Math.ceil(priceCents / count) };
}
