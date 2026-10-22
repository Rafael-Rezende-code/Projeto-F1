// Configuração do frete (refino 2, item 7). Valores são EXEMPLO: ajuste aqui (ou nas variáveis de ambiente indicadas)
// quando tiver os números reais. Guia em docs/backend/frete.md.

/** CEP de onde a loja posta (Melhor Envio usa como origem). Padrão: São Sebastião do Paraíso, MG. */
export const ORIGIN_CEP = (process.env.SHIPPING_ORIGIN_CEP ?? "37950000").replace(/\D/g, "");

const wholeNumber = (value: string | undefined) => {
  const number = Number(String(value ?? "").trim());
  return String(value ?? "").trim() !== "" && Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
};
const localPrice = wholeNumber(process.env.LOCAL_DELIVERY_PRICE_CENTS);
const localMin = wholeNumber(process.env.LOCAL_DELIVERY_DAYS_MIN);
const localMax = wholeNumber(process.env.LOCAL_DELIVERY_DAYS_MAX);
const localFree = wholeNumber(process.env.LOCAL_DELIVERY_FREE_FROM_CENTS);

/**
 * Entrega local (a própria loja entrega): faixas de CEP atendidas, preço e prazo. SÓ EXISTE quando configurada: precisa de
 * LOCAL_DELIVERY_ENABLED=true E de LOCAL_DELIVERY_PRICE_CENTS, LOCAL_DELIVERY_DAYS_MIN e LOCAL_DELIVERY_DAYS_MAX (preço e
 * prazo são promessas: nada é escrito à mão). LOCAL_DELIVERY_FREE_FROM_CENTS (opcional) = grátis a partir desse subtotal;
 * sem ele, nunca é grátis. A faixa 37950-000 a 37959-999 é a de São Sebastião do Paraíso, MG; cidades vizinhas entram
 * acrescentando faixas aqui. [CONFIRMAR] as faixas com quem faz a entrega.
 */
export const LOCAL_DELIVERY = {
  enabled: process.env.LOCAL_DELIVERY_ENABLED === "true" && localPrice !== null && localMin !== null && localMax !== null && localMax >= localMin,
  label: "Entrega local",
  description: "São Sebastião do Paraíso e região",
  ranges: [{ from: "37950000", to: "37959999", name: "São Sebastião do Paraíso, MG" }],
  priceCents: localPrice ?? 0,
  /** Grátis a partir deste subtotal (null: nunca grátis). */
  freeFromCents: localFree as number | null,
  transitDays: { min: localMin ?? 0, max: localMax ?? 0 },
};

/** Melhor Envio: ligado só com token (MELHOR_ENVIO_TOKEN). Sandbox até MELHOR_ENVIO_ENV=production. */
export const MELHOR_ENVIO = {
  token: process.env.MELHOR_ENVIO_TOKEN ?? "",
  baseUrl: process.env.MELHOR_ENVIO_ENV === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br",
  /** Contato exigido no User-Agent pela API ("Aplicação (e-mail)"). */
  userAgent: `Apex (${process.env.MELHOR_ENVIO_CONTACT_EMAIL ?? process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contato@exemplo.com"})`,
  /** Serviços aceitos (ids do Melhor Envio); vazio = todos que a API devolver sem erro. */
  services: (process.env.MELHOR_ENVIO_SERVICES ?? "").split(",").map((id) => id.trim()).filter(Boolean),
  /** Declarar valor (seguro) pelo preço dos itens. */
  insurance: true,
};

export const isMelhorEnvioConfigured = () => Boolean(MELHOR_ENVIO.token);
