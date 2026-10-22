// Configuração do frete (refino 2, item 7). Valores são EXEMPLO: ajuste aqui (ou nas variáveis de ambiente indicadas)
// quando tiver os números reais. Guia em docs/backend/frete.md.

/** CEP de onde a loja posta (Melhor Envio usa como origem). Padrão: São Sebastião do Paraíso, MG. */
export const ORIGIN_CEP = (process.env.SHIPPING_ORIGIN_CEP ?? "37950000").replace(/\D/g, "");

/**
 * Entrega local (a própria loja entrega): faixas de CEP atendidas, preço e prazo. A faixa 37950-000 a 37959-999 é a de
 * São Sebastião do Paraíso, MG; cidades vizinhas entram acrescentando faixas aqui. [CONFIRMAR] as faixas, o preço e o
 * prazo com quem faz a entrega. `enabled: false` desliga a opção.
 */
export const LOCAL_DELIVERY = {
  enabled: process.env.LOCAL_DELIVERY_ENABLED !== "false",
  label: "Entrega local",
  description: "São Sebastião do Paraíso e região",
  ranges: [{ from: "37950000", to: "37959999", name: "São Sebastião do Paraíso, MG" }],
  priceCents: Number(process.env.LOCAL_DELIVERY_PRICE_CENTS ?? 1000),
  /** Grátis a partir deste subtotal (null: nunca grátis). */
  freeFromCents: 15000 as number | null,
  transitDays: { min: 1, max: 2 },
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
