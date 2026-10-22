import { describe, expect, it } from "vitest";
import { orderFromRow, orderStatusFromPayment, type OrderRow } from "./mapping";

const row: OrderRow = {
  id: "APX-1",
  access_token: "6f1c1b7e-2b1a-4c55-9a64-1f1c2b3d4e5f",
  customer_name: "Maria Silva",
  customer_email: "maria@exemplo.com",
  customer_phone: null,
  address: { street: "Rua A", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
  shipping: { id: "economica", label: "Econômica", days: "7 a 10 dias úteis", priceCents: 0 },
  status: "aguardando-pagamento",
  payment_method: "pix",
  payment_provider: "mercadopago",
  payment_reference: "123",
  payment_status: "pending",
  payment_details: { instructions: "Pague com Pix", pix: { qrCode: "000201..." } },
  subtotal_cents: 10000,
  shipping_cents: 2490,
  total_cents: 12490,
  tracking_code: null,
  shipped_at: null,
  created_at: "2026-10-22T12:00:00Z",
  order_items: [{ sku: "A-M", product_slug: "a", name: "A", size: "M", image: "", unit_price_cents: 10000, quantity: 1 }],
};

describe("pedido gravado", () => {
  it("linha → Order (frete do banco, instruções separadas dos detalhes, link do cliente)", () => {
    const order = orderFromRow(row);
    expect(order.shipping.priceCents).toBe(2490);
    expect(order.payment.instructions).toBe("Pague com Pix");
    expect(order.payment.details).toEqual({ pix: { qrCode: "000201..." } });
    expect(order.lines[0]).toMatchObject({ sku: "A-M", unitPriceCents: 10000 });
    expect(order.simulated).toBe(false);
    expect(order.accessToken).toBe(row.access_token);
    expect(order.tracking).toBeUndefined();
  });

  it("status do pagamento → status do pedido", () => {
    expect(orderStatusFromPayment("approved")).toBe("pago");
    expect(orderStatusFromPayment("rejected")).toBe("recusado");
    expect(orderStatusFromPayment("cancelled")).toBe("cancelado");
    expect(orderStatusFromPayment("in_process")).toBe("aguardando-pagamento");
    expect(orderStatusFromPayment("pending")).toBe("aguardando-pagamento");
  });
});
