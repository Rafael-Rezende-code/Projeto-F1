import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { Stars } from "@/components/stars";
import { REVIEWS_ENABLED } from "@/lib/reviews";
import { moderateReview } from "./actions";

type Row = { id: string; product_slug: string; order_id: string; rating: number; title: string; body: string; display_name: string; status: string; created_at: string; moderated_by: string | null };
const TABS = [
  { value: "pendente", label: "Pendentes" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "rejeitada", label: "Rejeitadas" },
] as const;

// Fila de moderação das avaliações (refino 3, item 2.5): pendentes primeiro; aprovar publica, rejeitar esconde.
export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const wanted = (await searchParams).status;
  const status = TABS.find((tab) => tab.value === wanted)?.value ?? "pendente";
  const { data, error } = await supabase.from("reviews").select("id, product_slug, order_id, rating, title, body, display_name, status, created_at, moderated_by").eq("status", status).order("created_at", { ascending: status !== "pendente" }).limit(200);
  const rows = (data ?? []) as Row[];
  const button = "min-h-10 rounded-xl px-4 text-sm font-medium transition";
  return (
    <div>
      <h1 className="text-4xl tracking-[-0.05em]">Avaliações</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Clientes de pedidos entregues avaliam pela consulta de pedido. Nada aparece no site antes de aprovado.
        {!REVIEWS_ENABLED && " As avaliações estão DESLIGADAS no site (NEXT_PUBLIC_REVIEWS_ENABLED); a fila continua disponível."}
      </p>
      <nav aria-label="Situação" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link key={tab.value} href={`/admin/avaliacoes?status=${tab.value}`} aria-current={tab.value === status ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm ${tab.value === status ? "bg-black text-white" : "bg-white hover:bg-black/5"}`}>
            {tab.label}
          </Link>
        ))}
      </nav>
      {error && <p role="alert" className="mt-4 text-sm text-[#b42318]">Erro ao carregar: {error.message}. Se a tabela não existe, rode o supabase/atualizacao-3.sql.</p>}
      <ul role="list" className="mt-6 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Stars rating={row.rating} />
              <p className="text-xs text-black/60">
                <Link href={`/produtos/${row.product_slug}`} className="hover:underline">{row.product_slug}</Link> · pedido{" "}
                <Link href={`/admin/pedidos/${row.order_id}`} className="font-mono hover:underline">{row.order_id}</Link> · {new Date(row.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {row.moderated_by && ` · por ${row.moderated_by}`}
              </p>
            </div>
            <h2 className="mt-3 font-medium">{row.title}</h2>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-black/70">{row.body}</p>
            <p className="mt-2 text-xs text-black/60">Nome exibido: {row.display_name}</p>
            <form action={moderateReview} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={row.id} />
              {row.status !== "aprovada" && <button name="decisao" value="aprovada" className={`${button} bg-[#1f7a3a] text-white hover:bg-[#17602d]`}>Aprovar</button>}
              {row.status !== "rejeitada" && <button name="decisao" value="rejeitada" className={`${button} bg-black/5 text-[#b42318] hover:bg-[#b42318]/10`}>Rejeitar</button>}
              {row.status !== "pendente" && <button name="decisao" value="pendente" className={`${button} bg-black/5 hover:bg-black/10`}>Voltar para pendente</button>}
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-black/60">Nada aqui.</li>}
      </ul>
    </div>
  );
}
