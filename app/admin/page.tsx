import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";

// Início do painel: atalhos e números rápidos (pedidos por status, produtos por status, variantes sem estoque).
export default async function AdminHome() {
  if (adminDisabled()) return null;
  const { supabase, user } = await requireAdmin();
  const count = async (table: string, column: string, value: string) =>
    (await supabase.from(table).select("*", { count: "exact", head: true }).eq(column, value)).count ?? 0;
  const toBuy = (await supabase.from("order_items").select("id, orders!inner(status)", { count: "exact", head: true }).eq("item_status", "aguardando-compra").eq("orders.status", "pago")).count ?? 0;
  const [paid, waiting, active, drafts, empty] = await Promise.all([
    count("orders", "status", "pago"),
    count("orders", "status", "aguardando-pagamento"),
    count("products", "status", "active"),
    count("products", "status", "draft"),
    count("product_variants", "stock", "0"),
  ]);
  const cards = [
    { label: "Pedidos pagos para enviar", value: paid, href: "/admin/pedidos?status=pago" },
    { label: "Itens para comprar no fornecedor", value: toBuy, href: "/admin/fornecedor" },
    { label: "Aguardando pagamento", value: waiting, href: "/admin/pedidos?status=aguardando-pagamento" },
    { label: "Produtos publicados", value: active, href: "/admin/produtos?status=active" },
    { label: "Rascunhos", value: drafts, href: "/admin/produtos?status=draft" },
    { label: "Tamanhos sem estoque", value: empty, href: "/admin/produtos" },
  ];
  return (
    <div>
      <p className="text-sm text-black/60">Olá, {user.email}.</p>
      <h1 className="mt-2 text-4xl tracking-[-0.05em]">Painel</h1>
      <ul role="list" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.label}>
            <Link href={card.href} className="block rounded-2xl bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="font-display text-4xl tracking-[-0.05em]">{card.value}</p>
              <p className="mt-2 text-sm text-black/60">{card.label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/produtos/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Novo produto</Link>
        <Link href="/admin/pedidos" className="rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-medium hover:border-black">Ver pedidos</Link>
      </div>
    </div>
  );
}
