// Pedido. Dois modos:
// - SIMULADO (padrão, sem Supabase): não há persistência. O servidor monta o pedido (preços e estoque conferidos no
//   catálogo) e o devolve ao cliente, que o guarda no sessionStorage para a página /pedido/[id].
// - GRAVADO (Supabase configurado, fase 9): o pedido vai para o banco pela função create_order (baixa de estoque na
//   mesma transação) e /pedido/[id]?t=<accessToken> lê do banco no servidor. Ver docs/backend/supabase.md.
export type OrderLine = { sku: string; slug: string; name: string; size: string; image: string; unitPriceCents: number; quantity: number };

/**
 * confirmado: aprovado no modo simulado · aguardando-pagamento: Pix/boleto em aberto ou cartão em análise ·
 * pago: aprovado pelo provedor · recusado: pagamento recusado (estoque devolvido) · cancelado: expirou ou foi
 * cancelado (estoque devolvido) · enviado: com código de rastreio (painel admin) · entregue.
 */
export type OrderStatus = "confirmado" | "aguardando-pagamento" | "pago" | "recusado" | "cancelado" | "enviado" | "entregue";

/** O que o provedor devolve para a página de status (nunca dados sensíveis do cartão). */
export type PaymentDetails = {
  pix?: { qrCode: string; qrCodeBase64?: string; ticketUrl?: string; expiresAt?: string };
  boleto?: { url: string; barcode?: string; expiresAt?: string };
  card?: { brand?: string; last4?: string; installments?: number };
  /** Motivo do provedor (ex.: cc_rejected_insufficient_amount), para a mensagem de recusa. */
  statusDetail?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: { name: string; email: string };
  address: { street: string; number: string; complement?: string; district: string; city: string; state: string; cep: string };
  shipping: { id: string; label: string; days: string; priceCents: number };
  payment: { method: "pix" | "cartao" | "boleto"; provider: string; reference: string; instructions?: string; details?: PaymentDetails };
  lines: OrderLine[];
  subtotalCents: number;
  totalCents: number;
  tracking?: { code: string; shippedAt?: string };
  /** true no modo simulado (nada foi cobrado). */
  simulated: boolean;
  /** Pedido gravado: chave do link do cliente (/pedido/[id]?t=...). */
  accessToken?: string;
};

export const ORDER_STORAGE_PREFIX = "apex:pedido:";

export function newOrderId() {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `APX-${time}-${random}`;
}

export const PAYMENT_LABELS: Record<Order["payment"]["method"], string> = { pix: "Pix", cartao: "Cartão de crédito", boleto: "Boleto" };

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  confirmado: "Confirmado",
  "aguardando-pagamento": "Aguardando pagamento",
  pago: "Pago",
  recusado: "Pagamento recusado",
  cancelado: "Cancelado",
  enviado: "Enviado",
  entregue: "Entregue",
};

/** Link da página do pedido (com a chave de acesso quando o pedido está gravado). */
export const orderUrl = (order: Pick<Order, "id" | "accessToken">) =>
  `/pedido/${encodeURIComponent(order.id)}${order.accessToken ? `?t=${order.accessToken}` : ""}`;
