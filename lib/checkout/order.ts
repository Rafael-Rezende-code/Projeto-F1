// Pedido SIMULADO: não há persistência real. O servidor monta o pedido (preços e estoque conferidos no catálogo) e o
// devolve ao cliente, que o guarda no sessionStorage para a página /pedido/[id]. Ver CLAUDE.md ("Checkout").
export type OrderLine = { sku: string; slug: string; name: string; size: string; image: string; unitPriceCents: number; quantity: number };

export type Order = {
  id: string;
  createdAt: string;
  status: "confirmado" | "aguardando-pagamento";
  customer: { name: string; email: string };
  address: { street: string; number: string; complement?: string; district: string; city: string; state: string; cep: string };
  shipping: { id: string; label: string; days: string; priceCents: number };
  payment: { method: "pix" | "cartao" | "boleto"; provider: string; reference: string; instructions?: string };
  lines: OrderLine[];
  subtotalCents: number;
  totalCents: number;
  simulated: true;
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
