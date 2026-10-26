import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { stockAlertsCsv, type StockAlertRow } from "@/lib/stock-alerts";

// CSV de todos os pedidos de aviso (só administrador logado; o RLS também só deixa o administrador ler a tabela).
export const dynamic = "force-dynamic";

type Row = { email: string; sku: string; created_at: string; notified_at: string | null; product_variants: { size: string; products: { name: string } | null } | null };

export async function GET() {
  if (adminDisabled()) return new Response("Painel desligado.", { status: 404 });
  const { supabase } = await requireAdmin();
  const rows: StockAlertRow[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await supabase
      .from("stock_alerts")
      .select("email, sku, created_at, notified_at, product_variants(size, products(name))")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) return new Response(`Erro ao ler a lista: ${error.message}`, { status: 500 });
    rows.push(...((data ?? []) as unknown as Row[]).map((row) => ({ email: row.email, sku: row.sku, created_at: row.created_at, notified_at: row.notified_at, product: row.product_variants?.products?.name, size: row.product_variants?.size })));
    if (!data || data.length < 1000) break;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(stockAlertsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="avise-me-${day}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
