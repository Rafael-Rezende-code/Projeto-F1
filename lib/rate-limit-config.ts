// Limites por IP (lib/rate-limit.ts). Ajuste aqui; a janela é em segundos (máximo 1 dia, regra do banco).
export const RATE_LIMITS = {
  checkout: { limit: 10, windowSeconds: 10 * 60 },
  cupom: { limit: 20, windowSeconds: 10 * 60 },
  "consulta-pedido": { limit: 8, windowSeconds: 15 * 60 },
  newsletter: { limit: 5, windowSeconds: 60 * 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Tente de novo em alguns minutos.";
