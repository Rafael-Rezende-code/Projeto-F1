import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";

type Row = { id: string; email: string; sku: string; created_at: string; notified_at: string | null; product_variants: { size: string; products: { name: string; slug: string } | null } | null };

// "Avise-me quando chegar" (refino 3, item 2.4): pedidos de aviso de tamanho esgotado (tabela stock_alerts, só admin lê
// pelo RLS), do mais recente, com o produto e o tamanho, e o CSV. O aviso em si é manual (não há e-mail automático).
export default async function AdminStockAlerts() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const [list, total, pending] = await Promise.all([
    supabase.from("stock_alerts").select("id, email, sku, created_at, notified_at, product_variants(size, products(name, slug))").order("created_at", { ascending: false }).limit(500),
    supabase.from("stock_alerts").select("*", { count: "exact", head: true }),
    supabase.from("stock_alerts").select("*", { count: "exact", head: true }).is("notified_at", null),
  ]);
  const rows = (list.data ?? []) as unknown as Row[];
  const error = list.error ?? total.error;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-[-0.05em]">Avise-me</h1>
          <p className="mt-2 text-sm text-black/60">
            {total.count ?? 0} pedido(s) de aviso, {pending.count ?? 0} ainda sem aviso. Quando o tamanho voltar, avise por e-mail e marque como avisado na tabela.
          </p>
        </div>
        <Link href="/admin/avise-me/exportar" prefetch={false} className="inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">
          Baixar CSV
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#b42318]">
          Erro ao carregar: {error.message}. Se a tabela não existe, rode o supabase/atualizacao-3.sql (docs/backend/supabase.md).
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-black/60">
            <tr><th className="px-4 py-3 font-medium">E-mail</th><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Tamanho</th><th className="px-4 py-3 font-medium">Pedido em</th><th className="px-4 py-3 font-medium">Situação</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.product_variants?.products ? <Link href={`/produtos/${row.product_variants.products.slug}`} className="hover:underline">{row.product_variants.products.name}</Link> : row.sku}</td>
                <td className="px-4 py-3">{row.product_variants?.size ?? "—"}</td>
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-3">{row.notified_at ? "Avisado" : "Aguardando estoque"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-black/60">Nenhum pedido de aviso ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
