import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";

type Row = { id: string; slug: string; title: string; team_slug: string | null; driver_slug: string | null; product_slugs: string[]; discount_percent: number; active: boolean };

// Kits (loja extra, item 2): lista com peças, desconto e situação.
export default async function AdminKits() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("kits").select("id, slug, title, team_slug, driver_slug, product_slugs, discount_percent, active").order("title");
  const rows = (data ?? []) as Row[];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Kits</h1>
        <Link href="/admin/kits/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Novo kit</Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-black/60">O desconto vale quando todas as peças estão na sacola (qualquer tamanho) e é calculado no servidor ao criar o pedido.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Não foi possível carregar: {error.message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-black/60">
            <tr><th className="p-4 font-medium">Kit</th><th className="p-4 font-medium">Página</th><th className="p-4 font-medium">Peças</th><th className="p-4 font-medium">Desconto</th><th className="p-4 font-medium">Situação</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-4"><Link href={`/admin/kits/${row.id}`} className="font-medium underline underline-offset-4">{row.title}</Link></td>
                <td className="p-4 text-xs text-black/70">{[row.driver_slug && `piloto ${row.driver_slug}`, row.team_slug && `equipe ${row.team_slug}`].filter(Boolean).join(" · ")}</td>
                <td className="p-4 font-mono text-xs">{row.product_slugs.join(", ")}</td>
                <td className="p-4 tabular-nums">{row.discount_percent}%</td>
                <td className="p-4">{row.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-black/60">Nenhum kit ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
