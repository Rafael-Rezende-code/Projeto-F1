import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { subscribersCsv, type SubscriberRow } from "@/lib/newsletter";

// CSV de todos os inscritos (só administrador logado; o RLS também só deixa o administrador ler a tabela).
export const dynamic = "force-dynamic";

export async function GET() {
  if (adminDisabled()) return new Response("Painel desligado.", { status: 404 });
  const { supabase } = await requireAdmin();
  const rows: SubscriberRow[] = [];
  // Páginas de 1000 (limite padrão do PostgREST) até acabar; teto de 100 mil linhas.
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("email, created_at, source, consent_text, unsubscribed_at")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) return new Response(`Erro ao ler a lista: ${error.message}`, { status: 500 });
    rows.push(...((data ?? []) as SubscriberRow[]));
    if (!data || data.length < 1000) break;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(subscribersCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${day}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
