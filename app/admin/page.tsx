import Link from "next/link";
import { RevenueBars } from "@/components/admin/revenue-bars";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { DASHBOARD_PERIODS, fillDays, parseDashboardParams, periodDays, type DashboardData } from "@/lib/admin/dashboard";
import { formatPrice } from "@/lib/format";

const now = () => new Date();
const FIELD = "rounded-xl border border-black/15 bg-white px-3 py-2 text-sm";

// Início do painel (operação, fase 2): pedidos e faturamento do período (só pedidos pagos; os de teste ficam fora, a não
// ser que se peça), ticket médio, barras por dia, mais vendidos, pendências (fornecedor, pagos sem envio) e estoque
// baixo com limite configurável na URL. Tudo vem de uma chamada (função admin_dashboard).
export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (adminDisabled()) return null;
  const { supabase, user } = await requireAdmin();
  const { period, lowStock, includeTests } = parseDashboardParams(await searchParams);
  const { days, since } = periodDays(period.days, now());
  const count = async (table: string, column: string, value: string) =>
    (await supabase.from(table).select("*", { count: "exact", head: true }).eq(column, value)).count ?? 0;
  const [{ data, error }, waiting, active, drafts] = await Promise.all([
    supabase.rpc("admin_dashboard", { p_since: since, p_low_stock: lowStock, p_include_test: includeTests }),
    count("orders", "status", "aguardando-pagamento"),
    count("products", "status", "active"),
    count("products", "status", "draft"),
  ]);
  const dash = data as DashboardData | null;
  const query = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ periodo: period.value, estoque: String(lowStock), ...(includeTests ? { testes: "com" } : {}), ...extra });
    return `/admin?${params}`;
  };
  const todo = [
    { label: "Pedidos pagos para enviar", value: dash?.paid_not_shipped ?? 0, href: "/admin/pedidos?status=pago" },
    { label: "Itens para comprar no fornecedor", value: dash?.awaiting_supplier ?? 0, href: "/admin/fornecedor" },
    { label: "Aguardando pagamento", value: waiting, href: "/admin/pedidos?status=aguardando-pagamento" },
    { label: "Produtos publicados", value: active, href: "/admin/produtos?status=active" },
    { label: "Rascunhos", value: drafts, href: "/admin/produtos?status=draft" },
  ];
  return (
    <div>
      <p className="text-sm text-black/60">Olá, {user.email}.</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Painel</h1>
        <nav aria-label="Período" className="flex flex-wrap gap-2">
          {DASHBOARD_PERIODS.map((item) => (
            <Link key={item.value} href={query({ periodo: item.value })} aria-current={item.value === period.value ? "page" : undefined} className={`rounded-xl px-3 py-2 text-sm ${item.value === period.value ? "bg-black text-white" : "bg-white hover:bg-black/5"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-[#b42318]">Indicadores indisponíveis: {error.message}. Rode a atualização do banco (supabase/atualizacao-2.sql).</p>}

      <dl className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Pedidos pagos", String(dash?.orders ?? 0)],
          ["Faturamento", formatPrice(dash?.revenue_cents ?? 0)],
          ["Ticket médio", formatPrice(dash?.average_cents ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-5">
            <dt className="text-sm text-black/60">{label} · {period.label.toLowerCase()}</dt>
            <dd className="font-display mt-2 text-4xl tracking-[-0.05em]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-black/60">Conta pedidos pagos, enviados e entregues criados no período{includeTests ? ", incluindo os de teste" : "; pedidos de teste ficam fora"}. <Link href={query({ testes: includeTests ? "sem" : "com" })} className="underline underline-offset-4">{includeTests ? "Tirar os de teste" : "Incluir os de teste"}</Link></p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="faturamento-dia" className="rounded-2xl bg-white p-6">
          <h2 id="faturamento-dia" className="font-medium">Faturamento por dia</h2>
          <div className="mt-4"><RevenueBars data={fillDays(days, dash?.by_day ?? [])} /></div>
        </section>
        <section aria-labelledby="mais-vendidos" className="rounded-2xl bg-white p-6">
          <h2 id="mais-vendidos" className="font-medium">Mais vendidos</h2>
          {dash?.best_sellers.length ? (
            <ol className="mt-4 space-y-3 text-sm">
              {dash.best_sellers.map((item, i) => (
                <li key={item.slug} className="flex justify-between gap-3">
                  <span className="min-w-0"><span className="mr-2 text-black/60">{i + 1}.</span><Link href={`/produtos/${item.slug}`} target="_blank" className="hover:underline">{item.name}</Link></span>
                  <span className="whitespace-nowrap text-black/60">{item.quantity} un.</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-black/60">Nenhuma venda paga no período.</p>
          )}
        </section>
      </div>

      <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {todo.map((card) => (
          <li key={card.label}>
            <Link href={card.href} className="block h-full rounded-2xl bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="font-display text-3xl tracking-[-0.05em]">{card.value}</p>
              <p className="mt-2 text-sm text-black/60">{card.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="estoque-baixo" className="mt-6 rounded-2xl bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="estoque-baixo" className="font-medium">Estoque baixo (até {lowStock} un.)</h2>
          <form method="get" className="flex items-end gap-2">
            <input type="hidden" name="periodo" value={period.value} />
            {includeTests && <input type="hidden" name="testes" value="com" />}
            <label className="flex flex-col gap-1 text-xs font-medium text-black/70">Limite<input type="number" name="estoque" min={0} max={999} defaultValue={lowStock} className={`${FIELD} w-24`} /></label>
            <button type="submit" className="rounded-xl border border-black/15 px-3 py-2 text-sm font-medium hover:border-black">Aplicar</button>
          </form>
        </div>
        {dash?.low_stock.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-black/60"><tr><th className="py-2 font-medium">Produto</th><th className="py-2 font-medium">Tam.</th><th className="py-2 font-medium">SKU</th><th className="py-2 text-right font-medium">Estoque</th></tr></thead>
              <tbody>
                {dash.low_stock.map((row) => (
                  <tr key={row.sku} className="border-t border-black/5">
                    <td className="py-2">{row.name}</td><td className="py-2">{row.size}</td><td className="py-2 font-mono text-xs">{row.sku}</td>
                    <td className={`py-2 text-right font-medium ${row.stock === 0 ? "text-[#b42318]" : ""}`}>{row.stock === 0 ? "Esgotado" : row.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-black/60">Nenhum tamanho publicado com estoque até {lowStock}.</p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/produtos/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Novo produto</Link>
        <Link href="/admin/pedidos" className="rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-medium hover:border-black">Ver pedidos</Link>
      </div>
    </div>
  );
}
