import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { applyOrderFilters, ORDER_STATUS_FILTERS, orderFiltersQuery, parseOrderFilters } from "@/lib/admin/order-filters";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, type OrderStatus } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";

type Row = { id: string; created_at: string; customer_name: string; customer_email: string; status: OrderStatus; payment_method: "pix" | "cartao" | "boleto"; total_cents: number; is_test: boolean; refunded_at: string | null };
const FIELD = "rounded-xl border border-black/15 bg-white px-3 py-2 text-sm";

// Lista de pedidos, do mais recente, com filtro por status, período e pedidos de teste (os mesmos filtros da exportação).
export default async function AdminPedidos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const filters = parseOrderFilters(await searchParams);
  const status = filters.status;
  const query = supabase.from("orders").select("id, created_at, customer_name, customer_email, status, payment_method, total_cents, is_test, refunded_at");
  const { data, error } = await applyOrderFilters(query, filters).order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Pedidos</h1>
        <a href={`/admin/pedidos/exportar${orderFiltersQuery(filters)}`} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-medium hover:border-black">Exportar CSV</a>
      </div>
      <nav aria-label="Filtrar por status" className="mt-6 flex flex-wrap gap-2">
        {ORDER_STATUS_FILTERS.map((value) => (
          <Link
            key={value || "todos"}
            href={`/admin/pedidos${orderFiltersQuery({ ...filters, status: value })}`}
            aria-current={status === value ? "page" : undefined}
            className={`rounded-xl px-3 py-2 text-sm ${status === value ? "bg-black text-white" : "bg-white hover:bg-black/5"}`}
          >
            {value ? ORDER_STATUS_LABELS[value] : "Todos"}
          </Link>
        ))}
      </nav>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex flex-col gap-1 text-xs font-medium text-black/70">De<input type="date" name="de" defaultValue={filters.from} className={FIELD} /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-black/70">Até<input type="date" name="ate" defaultValue={filters.to} className={FIELD} /></label>
        <label className="flex flex-col gap-1 text-xs font-medium text-black/70">
          Pedidos de teste
          <select name="testes" defaultValue={filters.tests} className={FIELD}>
            <option value="sem">Sem os de teste</option>
            <option value="com">Com os de teste</option>
            <option value="so">Só os de teste</option>
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-[#b94f01]">Filtrar</button>
        {(filters.from || filters.to || filters.tests !== "sem") && <Link href={`/admin/pedidos${status ? `?status=${status}` : ""}`} className="py-2 text-sm underline underline-offset-4">Limpar período</Link>}
      </form>
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
                <td className="px-4 py-3">
                  {ORDER_STATUS_LABELS[row.status]}
                  {row.refunded_at && <span className="block text-xs text-black/60">Reembolsado</span>}
                  {row.is_test && <span className="mt-1 inline-block rounded-md bg-[#fff4d6] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a5200]">Teste</span>}
                </td>
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
