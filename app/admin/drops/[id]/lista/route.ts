import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { csvDateTime, csvResponse, toCsv } from "@/lib/admin/csv";

// CSV da lista de espera de um drop (loja extra, item 6).
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return new Response("Painel desligado.", { status: 404 });
  const { supabase } = await requireAdmin();
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Drop inválido.", { status: 404 });
  const [{ data: drop }, { data, error }, { data: notified }] = await Promise.all([
    supabase.from("drops").select("slug").eq("id", id).maybeSingle(),
    supabase.from("drop_waitlist").select("email, created_at").eq("drop_id", id).order("created_at").limit(10000),
    supabase.from("drop_notifications").select("email, status, updated_at").eq("drop_id", id).limit(10000),
  ]);
  if (error || !drop) return new Response("Não foi possível ler a lista.", { status: 500 });
  const statusOf = new Map((notified ?? []).map((item: { email: string; status: string; updated_at: string }) => [item.email, item]));
  const csv = toCsv(
    ["e-mail", "entrou_em", "aviso", "aviso_em"],
    (data ?? []).map((row: { email: string; created_at: string }) => [row.email, csvDateTime(row.created_at), statusOf.get(row.email)?.status ?? "", csvDateTime(statusOf.get(row.email)?.updated_at ?? null)]),
  );
  return csvResponse(csv, `lista-de-espera-${drop.slug}.csv`);
}
