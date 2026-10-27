import type { Fulfillment } from "@/lib/catalog/types";
import type { Order, OrderItemStatus, OrderStatus, PaymentDetails } from "@/lib/checkout/order";

// Linhas de orders/order_items (supabase/migrations) → Order (lib/checkout/order.ts). Função pura (com teste).
export type OrderItemRow = {
  sku: string;
  product_slug: string;
  name: string;
  size: string;
  image: string;
  unit_price_cents: number;
  quantity: number;
  // Migração 20261023000000_modelo_de_venda.sql (opcionais: banco sem ela continua funcionando).
  id?: string;
  fulfillment?: Fulfillment;
  dispatch_min_days?: number;
  dispatch_max_days?: number;
  item_status?: OrderItemStatus;
  tracking_code?: string | null;
  supplier_tracking_code?: string | null;
};
export type OrderRow = {
  id: string;
  access_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  address: Order["address"];
  shipping: Order["shipping"];
  status: Exclude<OrderStatus, "confirmado">;
  payment_method: Order["payment"]["method"];
  payment_provider: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  payment_details: PaymentDetails & { instructions?: string };
  subtotal_cents: number;
  shipping_cents: number;
  coupon_code?: string | null;
  discount_cents?: number;
  shipping_discount_cents?: number;
  payment_discount_cents?: number;
  payment_discount_percent?: number;
  total_cents: number;
  tracking_code: string | null;
  shipped_at: string | null;
  created_at: string;
  order_items?: OrderItemRow[];
};

export function orderFromRow(row: OrderRow): Order {
  const { instructions, ...details } = row.payment_details ?? {};
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    customer: { name: row.customer_name, email: row.customer_email },
    address: row.address,
    shipping: { ...row.shipping, priceCents: row.shipping_cents },
    payment: {
      method: row.payment_method,
      provider: row.payment_provider ?? "",
      reference: row.payment_reference ?? "",
      instructions,
      details: Object.keys(details).length ? details : undefined,
    },
    lines: (row.order_items ?? []).map((item) => ({
      sku: item.sku,
      slug: item.product_slug,
      name: item.name,
      size: item.size,
      image: item.image,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      fulfillment: item.fulfillment,
      dispatchDays: item.dispatch_min_days != null && item.dispatch_max_days != null ? { min: item.dispatch_min_days, max: item.dispatch_max_days } : undefined,
      status: item.item_status,
      // supplier_tracking_code NÃO vai para o cliente (só painel admin).
      tracking: item.tracking_code ?? undefined,
    })),
    subtotalCents: row.subtotal_cents,
    coupon: row.coupon_code ? { code: row.coupon_code, discountCents: row.discount_cents ?? 0, shippingDiscountCents: row.shipping_discount_cents ?? 0 } : undefined,
    paymentDiscount: row.payment_discount_cents ? { percent: row.payment_discount_percent ?? 0, cents: row.payment_discount_cents } : undefined,
    totalCents: row.total_cents,
    tracking: row.tracking_code ? { code: row.tracking_code, shippedAt: row.shipped_at ?? undefined } : undefined,
    simulated: false,
    accessToken: row.access_token,
  };
}

/** Status do pedido a partir do status do pagamento (Mercado Pago: approved, pending, in_process, rejected...). */
export function orderStatusFromPayment(paymentStatus: string): Exclude<OrderStatus, "confirmado" | "enviado" | "entregue"> {
  if (paymentStatus === "approved") return "pago";
  if (paymentStatus === "rejected") return "recusado";
  if (paymentStatus === "cancelled" || paymentStatus === "refunded" || paymentStatus === "charged_back") return "cancelado";
  return "aguardando-pagamento"; // pending, in_process, authorized, in_mediation
}
