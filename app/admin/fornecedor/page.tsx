import { personalizationLabel } from "@/lib/personalization";
import Link from "next/link";
import { SupplierItem } from "@/components/admin/supplier-item";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { supplierAddressText } from "@/lib/admin/supplier";
import { daysLabel } from "@/lib/catalog/fulfillment";
import { ORDER_ITEM_STATUS_ADMIN_LABELS, type Order } from "@/lib/checkout/order";

type QueueRow = {
  personalization: { name?: string; number?: string } | null;
  id: string;
  product_id: string | null;
  name: string;
  size: string;
  sku: string;
  quantity: number;
  item_status: "aguardando-compra" | "comprado";
  supplier_tracking_code: string | null;
  dispatch_min_days: number;
  dispatch_max_days: number;
  purchased_at: string | null;
  orders: { id: string; created_at: string; customer_name: string; customer_email: string; customer_phone: string | null; address: Order["address"] };
};

// Fila "Comprar no fornecedor" (refino 2, item 6): itens SOB ENCOMENDA de pedidos PAGOS que ainda não foram comprados
// (e os comprados, para acompanhar o rastreio). Compra manual: o painel só mostra o link, copia os dados do cliente e
// registra a compra. Mais antigos primeiro (o prazo do cliente corre desde o pagamento).
export default async function FilaFornecedor() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("order_items")
    .select("id, product_id, name, size, sku, quantity, personalization, item_status, supplier_tracking_code, dispatch_min_days, dispatch_max_days, purchased_at, orders!inner(id, created_at, status, customer_name, customer_email, customer_phone, address)")
    .eq("fulfillment", "sob_encomenda")
    .in("item_status", ["aguardando-compra", "comprado"])
    .eq("orders.status", "pago")
    .order("created_at", { referencedTable: "orders", ascending: true })
    .limit(200);
  const rows = (data ?? []) as unknown as QueueRow[];
  const productIds = [...new Set(rows.map((row) => row.product_id).filter(Boolean))] as string[];
  const { data: links } = productIds.length ? await supabase.from("product_private").select("product_id, supplier_url").in("product_id", productIds) : { data: [] };
  const urlOf = new Map((links ?? []).map((link) => [link.product_id as string, link.supplier_url as string | null]));
  const waiting = rows.filter((row) => row.item_status === "aguardando-compra");
  const bought = rows.filter((row) => row.item_status === "comprado");

  const list = (items: QueueRow[]) => (
    <ul role="list" className="mt-4 space-y-3">
      {items.map((row) => (
        <li key={row.id} className="rounded-2xl bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-black/60">SKU {row.sku} · Tam. {row.size} · Qtd. {row.quantity} · envio prometido em {daysLabel({ min: row.dispatch_min_days, max: row.dispatch_max_days })}</p>
              {row.personalization && <span className="mt-1 inline-block rounded-md bg-[#b94f01] px-2 py-0.5 text-xs font-semibold tracking-[0.04em] text-white" data-personalization>{personalizationLabel(row.personalization)}</span>}
            </div>
            <div className="text-right text-xs text-black/60">
              <Link href={`/admin/pedidos/${encodeURIComponent(row.orders.id)}`} className="font-medium text-black underline underline-offset-4">{row.orders.id}</Link>
              <p>Pedido de {new Date(row.orders.created_at).toLocaleDateString("pt-BR")}</p>
              <p>{ORDER_ITEM_STATUS_ADMIN_LABELS[row.item_status]}{row.purchased_at ? ` em ${new Date(row.purchased_at).toLocaleDateString("pt-BR")}` : ""}</p>
            </div>
          </div>
          <SupplierItem
            itemId={row.id}
            status={row.item_status}
            supplierUrl={row.product_id ? urlOf.get(row.product_id) : null}
            tracking={row.supplier_tracking_code}
            addressText={supplierAddressText({ name: row.orders.customer_name, email: row.orders.customer_email, phone: row.orders.customer_phone }, row.orders.address)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Comprar no fornecedor</h1>
        <a href="/admin/fornecedor/exportar" className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-medium hover:border-black">Exportar CSV</a>
      </div>
      <p className="mt-2 max-w-[70ch] text-sm leading-6 text-black/60">
        Itens sob encomenda de pedidos pagos. A compra é manual: abra o fornecedor, cole os dados do cliente (ou o endereço
        da loja, se a peça vier para cá antes), finalize lá e marque como comprado aqui.
      </p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Não foi possível carregar a fila: {error.message}</p>}
      <section aria-labelledby="fila-comprar" className="mt-8">
        <h2 id="fila-comprar" className="font-medium">Para comprar ({waiting.length})</h2>
        {waiting.length ? list(waiting) : <p className="mt-3 rounded-2xl bg-white p-6 text-sm text-black/60">Nada para comprar agora.</p>}
      </section>
      <section aria-labelledby="fila-comprados" className="mt-10">
        <h2 id="fila-comprados" className="font-medium">Comprados, a caminho ({bought.length})</h2>
        {bought.length ? list(bought) : <p className="mt-3 rounded-2xl bg-white p-6 text-sm text-black/60">Nenhum item comprado aguardando envio.</p>}
      </section>
    </div>
  );
}
