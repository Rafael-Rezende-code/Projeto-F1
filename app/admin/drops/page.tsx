import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { launchLabel } from "@/lib/drops";

type Row = { id: string; slug: string; title: string; launch_at: string; mode: string; per_order_limit: number | null; product_slugs: string[]; active: boolean; drop_waitlist: { count: number }[] };
const currentTime = () => Date.now();

// Drops (loja extra, item 6): lista com data, modo, peças, lista de espera e situação.
export default async function AdminDrops() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("drops").select("id, slug, title, launch_at, mode, per_order_limit, product_slugs, active, drop_waitlist(count)").order("launch_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const now = currentTime();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Drops</h1>
        <Link href="/admin/drops/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Novo drop</Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-black/60">Antes do lançamento as peças aparecem como &quot;Em breve&quot; e não podem ser compradas (a loja e o banco recusam). Depois, a compra abre sozinha.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Não foi possível carregar: {error.message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-black/60">
            <tr><th className="p-4 font-medium">Drop</th><th className="p-4 font-medium">Lançamento (Brasília)</th><th className="p-4 font-medium">Modo</th><th className="p-4 font-medium">Peças</th><th className="p-4 font-medium">Lista de espera</th><th className="p-4 font-medium">Situação</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-4"><Link href={`/admin/drops/${row.id}`} className="font-medium underline underline-offset-4">{row.title}</Link></td>
                <td className="p-4">{launchLabel(row.launch_at)}{new Date(row.launch_at).getTime() <= now ? " · lançado" : ""}</td>
                <td className="p-4">{row.mode === "pre_venda" ? "Pré-venda" : "Lançamento"}{row.per_order_limit ? ` · até ${row.per_order_limit}/pedido` : ""}</td>
                <td className="p-4 tabular-nums">{row.product_slugs.length}</td>
                <td className="p-4 tabular-nums">{row.drop_waitlist?.[0]?.count ?? 0}</td>
                <td className="p-4">{row.active ? "Visível" : "Escondido"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-black/60">Nenhum drop ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
