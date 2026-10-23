import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { centsToDecimal, csvDateTime, csvResponse, toCsv } from "@/lib/admin/csv";
import { applyOrderFilters, parseOrderFilters } from "@/lib/admin/order-filters";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, type OrderStatus } from "@/lib/checkout/order";

// CSV dos pedidos (operação, fase 2), com os mesmos filtros da lista (status, período, testes). Só administrador logado;
// o RLS também só deixa o administrador ler. UTF-8 com BOM, ";" e vírgula decimal (lib/admin/csv.ts).
export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; status: OrderStatus; is_test: boolean; customer_name: string; customer_email: string; customer_phone: string | null;
  address: { city?: string; state?: string; cep?: string } | null; shipping: { label?: string } | null; payment_method: keyof typeof PAYMENT_LABELS;
  subtotal_cents: number; discount_cents: number | null; shipping_cents: number; total_cents: number; coupon_code: string | null;
  tracking_code: string | null; shipped_at: string | null; cancelled_at: string | null; refunded_at: string | null; order_items: { quantity: number }[];
};

export async function GET(request: Request) {
  if (adminDisabled()) return new Response("Painel desligado.", { status: 404 });
  const { supabase } = await requireAdmin();
  const filters = parseOrderFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows: Row[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const query = supabase
      .from("orders")
      .select("id, created_at, status, is_test, customer_name, customer_email, customer_phone, address, shipping, payment_method, subtotal_cents, discount_cents, shipping_cents, total_cents, coupon_code, tracking_code, shipped_at, cancelled_at, refunded_at, order_items(quantity)");
    const { data, error } = await applyOrderFilters(query, filters).order("created_at", { ascending: true }).range(from, from + 999);
    if (error) return new Response(`Erro ao ler os pedidos: ${error.message}`, { status: 500 });
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  const csv = toCsv(
    ["pedido", "data", "status", "teste", "cliente", "e-mail", "telefone", "cidade", "uf", "cep", "itens", "pagamento", "entrega", "subtotal", "desconto", "frete", "total", "cupom", "rastreio", "enviado_em", "cancelado_em", "reembolsado_em"],
    rows.map((row) => [
      row.id, csvDateTime(row.created_at), ORDER_STATUS_LABELS[row.status] ?? row.status, row.is_test, row.customer_name, row.customer_email, row.customer_phone,
      row.address?.city, row.address?.state, row.address?.cep, row.order_items.reduce((sum, item) => sum + item.quantity, 0),
      PAYMENT_LABELS[row.payment_method], row.shipping?.label, centsToDecimal(row.subtotal_cents), centsToDecimal(row.discount_cents), centsToDecimal(row.shipping_cents),
      centsToDecimal(row.total_cents), row.coupon_code, row.tracking_code, csvDateTime(row.shipped_at), csvDateTime(row.cancelled_at), csvDateTime(row.refunded_at),
    ]),
  );
  return csvResponse(csv, `pedidos-${new Date().toISOString().slice(0, 10)}.csv`);
}
