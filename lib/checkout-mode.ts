// Modo do checkout (loja extra, fase 0): em PRODUÇÃO sem provedor de pagamento real o checkout NÃO conclui ("Estamos
// finalizando a abertura da loja"); em Preview e local segue simulado, com a faixa "Modo de teste". A regra vale no
// servidor (placeOrder recusa) e na página (mostra o aviso no lugar do formulário). Produção = VERCEL_ENV "production"
// (variável de sistema da Vercel); `next start` local não é produção.
type Env = Record<string, string | undefined>;
export type CheckoutMode = "real" | "teste" | "bloqueado";

export function checkoutModeFor(env: Env, realProvider: boolean): CheckoutMode {
  if (realProvider) return "real";
  return (env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV) === "production" ? "bloqueado" : "teste";
}

export const CHECKOUT_BLOCKED_MESSAGE = "Estamos finalizando a abertura da loja. Em breve você poderá concluir a compra por aqui.";
