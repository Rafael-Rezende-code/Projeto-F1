import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, type OrderStatus } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";

const FILTERS: (OrderStatus | "")[] = ["", "pago", "aguardando-pagamento", "enviado", "entregue", "recusado", "cancelado"];
type Row = { id: string; created_at: string; customer_name: string; customer_email: string; status: OrderStatus; payment_method: "pix" | "cartao" | "boleto"; total_cents: number };

// Lista de pedidos, do mais recente, com filtro por status.
export default async function AdminPedidos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { status = "" } = await searchParams;
  let query = supabase.from("orders").select("id, created_at, customer_name, customer_email, status, payment_method, total_cents").order("created_at", { ascending: false }).limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  const rows = (data ?? []) as Row[];
  return (
    <div>
      <h1 className="text-4xl tracking-[-0.05em]">Pedidos</h1>
      <nav aria-label="Filtrar por status" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Link
            key={value || "todos"}
            href={value ? `/admin/pedidos?status=${value}` : "/admin/pedidos"}
            aria-current={status === value ? "page" : undefined}
            className={`rounded-xl px-3 py-2 text-sm ${status === value ? "bg-black text-white" : "bg-white hover:bg-black/5"}`}
          >
            {value ? ORDER_STATUS_LABELS[value] : "Todos"}
          </Link>
        ))}
      </nav>
      {error && <p role="alert" className="mt-4 text-sm text-[#b42318]">Erro ao carregar: {error.message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-black/60">
            <tr><th className="px-4 py-3 font-medium">Pedido</th><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Pagamento</th><th className="px-4 py-3 font-medium">Total</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/pedidos/${encodeURIComponent(row.id)}`} className="font-medium hover:underline">{row.id}</Link>
                  <span className="block text-xs text-black/60">{new Date(row.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                </td>
                <td className="px-4 py-3">{row.customer_name}<span className="block text-xs text-black/60">{row.customer_email}</span></td>
                <td className="px-4 py-3">{ORDER_STATUS_LABELS[row.status]}</td>
                <td className="px-4 py-3">{PAYMENT_LABELS[row.payment_method]}</td>
                <td className="px-4 py-3">{formatPrice(row.total_cents)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-black/60">Nenhum pedido.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
