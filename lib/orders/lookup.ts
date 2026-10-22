import type { OrderItemStatus, OrderStatus, Order } from "@/lib/checkout/order";

// Consulta de pedido por número + e-mail (/pedido/consultar, operação 1d). Peças puras (testes em lookup.test.ts); a
// leitura é a função SQL lookup_order (migração 20261027000000_consulta_e_limites.sql), que só devolve dados de
// acompanhamento: nada de CPF, telefone, endereço completo (só cidade/UF), chave do link ou rastreio do fornecedor.

export type OrderLookup = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: Order["payment"]["method"];
  shipping: { label: string; days: string };
  city: string;
  state: string;
  totalCents: number;
  tracking?: { code: string; shippedAt?: string };
  items: { name: string; size: string; image: string; quantity: number; slug: string; status?: OrderItemStatus; tracking?: string }[];
};

const ORDER_ID = /^[A-Z0-9][A-Z0-9-]{3,39}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Número em maiúsculas sem espaços e e-mail em minúsculas; null se algum dos dois não tem formato válido. */
export function normalizeLookupInput(id: unknown, email: unknown) {
  const orderId = String(id ?? "").replace(/\s+/g, "").toUpperCase();
  const mail = String(email ?? "").trim().toLowerCase();
  if (!ORDER_ID.test(orderId) || mail.length > 254 || !EMAIL.test(mail)) return null;
  return { orderId, email: mail };
}

/** O status por item só faz sentido depois do pagamento (antes, todos estão "separando"). */
export const showsItemStatus = (status: OrderStatus) => status === "pago" || status === "enviado" || status === "entregue";

type Row = {
  id: string;
  created_at: string;
  status: OrderStatus;
  payment_method: OrderLookup["paymentMethod"];
  shipping: { label?: string | null; days?: string | null } | null;
  city: string | null;
  state: string | null;
  total_cents: number;
  tracking_code: string | null;
  shipped_at: string | null;
  items: { name: string; size: string; image: string | null; quantity: number; slug: string; item_status: OrderItemStatus | null; tracking_code: string | null }[];
};

export function lookupFromRow(row: Row | null | undefined): OrderLookup | null {
  if (!row) return null;
  const itemStatus = showsItemStatus(row.status);
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    paymentMethod: row.payment_method,
    shipping: { label: row.shipping?.label ?? "", days: row.shipping?.days ?? "" },
    city: row.city ?? "",
    state: row.state ?? "",
    totalCents: row.total_cents,
    ...(row.tracking_code ? { tracking: { code: row.tracking_code, ...(row.shipped_at ? { shippedAt: row.shipped_at } : {}) } } : {}),
    items: (row.items ?? []).map((item) => ({
      name: item.name,
      size: item.size,
      image: item.image ?? "",
      quantity: item.quantity,
      slug: item.slug,
      ...(itemStatus && item.item_status ? { status: item.item_status } : {}),
      ...(item.tracking_code ? { tracking: item.tracking_code } : {}),
    })),
  };
}

/** Texto ÚNICO para "não existe" e "e-mail não confere" (não revela qual dos dois). */
export const LOOKUP_NOT_FOUND = "Não encontramos um pedido com esse número e esse e-mail. Confira os dois (o número está no e-mail de confirmação) e tente de novo.";
