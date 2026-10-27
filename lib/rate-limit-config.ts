// Limites por IP (lib/rate-limit.ts). Ajuste aqui; a janela é em segundos (máximo 1 dia, regra do banco).
export const RATE_LIMITS = {
  checkout: { limit: 10, windowSeconds: 10 * 60 },
  cupom: { limit: 20, windowSeconds: 10 * 60 },
  "consulta-pedido": { limit: 8, windowSeconds: 15 * 60 },
  newsletter: { limit: 5, windowSeconds: 60 * 60 },
  // "Avise-me quando chegar" (refino 3): o gatilho da tabela também limita (10 por IP por hora).
  "avise-me": { limit: 10, windowSeconds: 60 * 60 },
  // Avaliação pela consulta de pedido (refino 3; só com NEXT_PUBLIC_REVIEWS_ENABLED).
  avaliacao: { limit: 10, windowSeconds: 60 * 60 },
  // Lista de desejos com link curto (loja extra, item 4): só a criação conta; atualizar a própria lista não.
  lista: { limit: 10, windowSeconds: 60 * 60 },
  // Login do painel: por IP, por e-mail e o contador de falhas (só serve ao atraso crescente; o limite alto nunca bloqueia).
  "admin-login-ip": { limit: 10, windowSeconds: 15 * 60 },
  "admin-login-email": { limit: 6, windowSeconds: 15 * 60 },
  "admin-login-falha": { limit: 1000, windowSeconds: 15 * 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Tente de novo em alguns minutos.";
