import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";

type Row = { id: string; code: string | null; slug: string; name: string; status: string; price_cents: number; product_variants: { stock: number }[]; product_images: { src: string; position: number }[] };

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Publicado", className: "bg-[#1f7a3a]/10 text-[#1f7a3a]" },
  draft: { label: "Rascunho", className: "bg-black/5 text-black/70" },
  archived: { label: "Arquivado", className: "bg-[#b42318]/10 text-[#b42318]" },
};

// Lista de produtos com busca (nome, slug ou código) e filtro por status.
export default async function AdminProdutos({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { q = "", status = "" } = await searchParams;
  let query = supabase.from("products").select("id, code, slug, name, status, price_cents, product_variants(stock), product_images(src, position)").order("position").order("created_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  if (q.trim()) {
    const term = q.trim().replace(/[%,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,code.ilike.%${term}%`);
  }
  const { data, error } = await query;
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-[-0.05em]">Produtos</h1>
          <p className="mt-1 text-sm text-black/60">{rows.length} {rows.length === 1 ? "produto" : "produtos"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/produtos/importar" className="rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-medium hover:border-black">Importar CSV</Link>
          <Link href="/admin/produtos/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Novo produto</Link>
        </div>
      </div>
      <form className="mt-6 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="q">Buscar</label>
        <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome, slug ou código" className="min-w-[240px] flex-1 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm" />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status} className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos</option>
          <option value="active">Publicados</option>
          <option value="draft">Rascunhos</option>
          <option value="archived">Arquivados</option>
        </select>
        <button className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white">Filtrar</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-[#b42318]">Erro ao carregar: {error.message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-black/60">
            <tr>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const stock = row.product_variants.reduce((sum, variant) => sum + variant.stock, 0);
              const out = row.product_variants.filter((variant) => variant.stock === 0).length;
              const image = [...row.product_images].sort((a, b) => a.position - b.position)[0]?.src;
              const badge = STATUS[row.status] ?? STATUS.draft;
              return (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/produtos/${row.id}`} className="flex items-center gap-3 hover:underline">
                      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura do painel */}
                      {image ? <img src={image} alt="" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-black/5" />}
                      <span>
                        <span className="block font-medium">{row.name}</span>
                        <span className="block text-xs text-black/60">{row.code ?? row.slug}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span></td>
                  <td className="px-4 py-3">{formatPrice(row.price_cents)}</td>
                  <td className="px-4 py-3">{stock}{out > 0 && <span className="ml-2 text-xs text-[#b42318]">{out} sem estoque</span>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-black/60">Nenhum produto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
