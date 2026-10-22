import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";

type Row = { id: string; email: string; created_at: string; source: string; unsubscribed_at: string | null };

// Inscritos na newsletter (tabela newsletter_subscribers: só administradores leem, pelo RLS), do mais recente, com a
// contagem e o botão que baixa o CSV (/admin/newsletter/exportar). Mostra os 500 mais recentes; o CSV leva todos.
export default async function AdminNewsletter() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const [list, total, active] = await Promise.all([
    supabase.from("newsletter_subscribers").select("id, email, created_at, source, unsubscribed_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).is("unsubscribed_at", null),
  ]);
  const rows = (list.data ?? []) as Row[];
  const error = list.error ?? total.error;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-[-0.05em]">Newsletter</h1>
          <p className="mt-2 text-sm text-black/60">
            {total.count ?? 0} inscrito(s), {active.count ?? 0} ativo(s). Cada inscrição guarda o texto de consentimento que a pessoa viu.
          </p>
        </div>
        <Link href="/admin/newsletter/exportar" prefetch={false} className="inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b94f01]">
          Baixar CSV
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#b42318]">
          Erro ao carregar: {error.message}. Se a tabela não existe, rode o supabase/setup-completo.sql (docs/backend/newsletter.md).
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-black/60">
            <tr><th className="px-4 py-3 font-medium">E-mail</th><th className="px-4 py-3 font-medium">Inscrito em</th><th className="px-4 py-3 font-medium">Origem</th><th className="px-4 py-3 font-medium">Situação</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-3">{row.source}</td>
                <td className="px-4 py-3">{row.unsubscribed_at ? "Descadastrado" : "Ativo"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-black/60">Nenhuma inscrição ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
