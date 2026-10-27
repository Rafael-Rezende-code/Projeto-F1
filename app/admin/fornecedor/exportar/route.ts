import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { csvDateTime, csvResponse, toCsv } from "@/lib/admin/csv";
import { ORDER_ITEM_STATUS_ADMIN_LABELS, type Order, type OrderItemStatus } from "@/lib/checkout/order";

// CSV da fila do fornecedor (operação, fase 2): os mesmos itens da página /admin/fornecedor (sob encomenda, pedidos
// pagos, aguardando compra ou comprados), com link do fornecedor e endereço de entrega para a compra manual.
export const dynamic = "force-dynamic";

type Row = {
  product_id: string | null; name: string; size: string; sku: string; personalization: { name?: string; number?: string } | null; quantity: number; item_status: OrderItemStatus; supplier_tracking_code: string | null; purchased_at: string | null;
  orders: { id: string; created_at: string; customer_name: string; customer_email: string; customer_phone: string | null; address: Order["address"]; is_test: boolean };
};

export async function GET() {
  if (adminDisabled()) return new Response("Painel desligado.", { status: 404 });
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, name, size, sku, personalization, quantity, item_status, supplier_tracking_code, purchased_at, orders!inner(id, created_at, status, is_test, customer_name, customer_email, customer_phone, address)")
    .eq("fulfillment", "sob_encomenda")
    .in("item_status", ["aguardando-compra", "comprado"])
    .eq("orders.status", "pago")
    .order("created_at", { referencedTable: "orders", ascending: true })
    .limit(5000);
  if (error) return new Response(`Erro ao ler a fila: ${error.message}`, { status: 500 });
  const rows = (data ?? []) as unknown as Row[];
  const ids = [...new Set(rows.map((row) => row.product_id).filter(Boolean))] as string[];
  const { data: links } = ids.length ? await supabase.from("product_private").select("product_id, supplier_url").in("product_id", ids) : { data: [] };
  const urlOf = new Map((links ?? []).map((link) => [link.product_id as string, (link.supplier_url as string | null) ?? ""]));
  const csv = toCsv(
    ["pedido", "data_pedido", "teste", "situacao", "produto", "sku", "tamanho", "PERSONALIZACAO_NOME", "PERSONALIZACAO_NUMERO", "quantidade", "link_fornecedor", "rastreio_fornecedor", "comprado_em", "cliente", "e-mail", "telefone", "endereco", "bairro", "cidade", "uf", "cep"],
    rows.map((row) => {
      const address = row.orders.address;
      return [
        row.orders.id, csvDateTime(row.orders.created_at), row.orders.is_test, ORDER_ITEM_STATUS_ADMIN_LABELS[row.item_status], row.name, row.sku, row.size, row.personalization?.name ?? "", row.personalization?.number ?? "", row.quantity,
        row.product_id ? urlOf.get(row.product_id) : "", row.supplier_tracking_code, csvDateTime(row.purchased_at), row.orders.customer_name, row.orders.customer_email,
        row.orders.customer_phone, `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}`, address.district, address.city, address.state, address.cep,
      ];
    }),
  );
  return csvResponse(csv, `fila-fornecedor-${new Date().toISOString().slice(0, 10)}.csv`);
}
