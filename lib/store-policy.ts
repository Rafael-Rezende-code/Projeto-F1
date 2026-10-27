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
//   NEXT_PUBLIC_POLICY_DISPATCH_DAYS_MAX      prazo MÁXIMO de postagem da pronta entrega, em dias úteis (faixa de benefícios da
//                                             home: "Postagem em até N dias úteis"); sem a variável, o item não aparece
//   NEXT_PUBLIC_LOW_STOCK_LIMIT               "Restam N unidades" na página do produto quando o estoque da variante for ≤ este
//                                             número (padrão 5; 0 desliga). Não é promessa: é o estoque cadastrado.
//   NEXT_PUBLIC_PIX_DISCOUNT_PERCENT          desconto no Pix, em % inteiro de 1 a 30 (padrão 0 = nada aparece). Incide sobre o
//                                             subtotal depois de cupom e kit, SEM o frete; o servidor recalcula pelo meio de pagamento.
//   NEXT_PUBLIC_COUPON_WITH_KIT               "true" deixa cupom e desconto de kit valerem juntos (padrão: não cumulativos).
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

/** Limite do aviso "Restam N unidades": padrão 5; "0" desliga; valor inválido usa o padrão. */
const lowStock = (value: string | undefined) => {
  const clean = String(value ?? "").trim();
  if (clean === "") return 5;
  const number = Number(clean);
  return Number.isInteger(number) && number >= 0 ? number : 5;
};

/** Desconto no Pix: inteiro de 1 a 30; qualquer outra coisa = 0 (desligado). */
const pixPercent = (value: string | undefined) => {
  const number = Number(String(value ?? "").trim());
  return Number.isInteger(number) && number > 0 && number <= 30 ? number : 0;
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
    dispatchDaysMax: positiveInt(env.NEXT_PUBLIC_POLICY_DISPATCH_DAYS_MAX),
    lowStockLimit: lowStock(env.NEXT_PUBLIC_LOW_STOCK_LIMIT),
    pixDiscountPercent: pixPercent(env.NEXT_PUBLIC_PIX_DISCOUNT_PERCENT),
    couponWithKit: env.NEXT_PUBLIC_COUPON_WITH_KIT === "true",
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
  NEXT_PUBLIC_POLICY_DISPATCH_DAYS_MAX: process.env.NEXT_PUBLIC_POLICY_DISPATCH_DAYS_MAX,
  NEXT_PUBLIC_LOW_STOCK_LIMIT: process.env.NEXT_PUBLIC_LOW_STOCK_LIMIT,
  NEXT_PUBLIC_PIX_DISCOUNT_PERCENT: process.env.NEXT_PUBLIC_PIX_DISCOUNT_PERCENT,
  NEXT_PUBLIC_COUPON_WITH_KIT: process.env.NEXT_PUBLIC_COUPON_WITH_KIT,
});

/** Preço no Pix ("R$ X no Pix"): null quando o desconto está desligado. Mesma conta de lib/pricing.ts. */
export const pixPrice = (cents: number, policy: StorePolicy = storePolicy) =>
  policy.pixDiscountPercent > 0 ? cents - Math.round((Math.max(0, cents) * policy.pixDiscountPercent) / 100) : null;

/** "Restam N unidades" (página do produto): estoque cadastrado de 1 até o limite (lib/store-policy, padrão 5). */
export const lowStockCount = (stock: number | undefined, policy: StorePolicy = storePolicy) =>
  stock !== undefined && stock > 0 && policy.lowStockLimit > 0 && stock <= policy.lowStockLimit ? stock : null;

/** Faixa de benefícios da home (refino 3, item 1.6): só os itens configurados; nenhum configurado = lista vazia. */
export type Benefit = { key: "frete" | "parcelas" | "local" | "prazo"; title: string; detail?: string };
export function storeBenefits(policy: StorePolicy, local: { enabled: boolean; description: string; transitDays: { min: number; max: number } } | null, money: (cents: number) => string): Benefit[] {
  const list: Benefit[] = [];
  if (policy.freeShippingFromCents) list.push({ key: "frete", title: `Frete grátis acima de ${money(policy.freeShippingFromCents)}` });
  const { max, interestFree } = policy.installments;
  if (max && max >= 2 && interestFree) list.push({ key: "parcelas", title: `Até ${max}x sem juros`, detail: "no cartão de crédito" });
  if (local?.enabled) {
    const { min, max: maxDays } = local.transitDays;
    list.push({ key: "local", title: "Entrega local", detail: `${local.description}, ${min === maxDays ? `${min}` : `${min} a ${maxDays}`} ${maxDays === 1 ? "dia útil" : "dias úteis"}` });
  }
  if (policy.dispatchDaysMax) list.push({ key: "prazo", title: `Postagem em até ${policy.dispatchDaysMax} ${policy.dispatchDaysMax === 1 ? "dia útil" : "dias úteis"}`, detail: "nos produtos de pronta entrega" });
  return list;
}

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

// Mensagens pré-preenchidas do WhatsApp (operação, fase 1a). Configuráveis por variável; sem ela, o texto padrão abaixo
// (neutro: não promete prazo de resposta). Marcadores: {produto}, {link} e {pedido}.
//   NEXT_PUBLIC_WHATSAPP_MESSAGE           mensagem geral (rodapé, /contato, demais páginas)
//   NEXT_PUBLIC_WHATSAPP_MESSAGE_PRODUCT   na página de produto
//   NEXT_PUBLIC_WHATSAPP_MESSAGE_ORDER     na página do pedido
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

export function createWhatsAppMessages(env: Env) {
  const generic = text(env.NEXT_PUBLIC_WHATSAPP_MESSAGE) ?? "Olá! Tenho uma dúvida sobre a loja.";
  const product = text(env.NEXT_PUBLIC_WHATSAPP_MESSAGE_PRODUCT) ?? "Olá! Tenho uma dúvida sobre o produto {produto}: {link}";
  const order = text(env.NEXT_PUBLIC_WHATSAPP_MESSAGE_ORDER) ?? "Olá! Tenho uma dúvida sobre o meu pedido {pedido}.";
  return {
    generic: () => generic,
    product: (name: string, url: string) => fill(product, { produto: name, link: url }),
    order: (orderId: string) => fill(order, { pedido: orderId }),
  };
}

export const whatsappMessages = createWhatsAppMessages({
  NEXT_PUBLIC_WHATSAPP_MESSAGE: process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE,
  NEXT_PUBLIC_WHATSAPP_MESSAGE_PRODUCT: process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_PRODUCT,
  NEXT_PUBLIC_WHATSAPP_MESSAGE_ORDER: process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_ORDER,
});
