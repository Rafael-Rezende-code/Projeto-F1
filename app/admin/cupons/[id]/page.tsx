import Link from "next/link";
import { notFound } from "next/navigation";
import { CouponFormView } from "@/components/admin/coupon-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { toLocalInput } from "@/lib/admin/coupon-schema";
import type { CouponKind } from "@/lib/coupons";
import { formatPrice } from "@/lib/format";

// Editar cupom + usos (pedidos que usaram, com o desconto de cada um).
export default async function EditarCupom({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabase.from("coupons").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as { id: string; code: string; kind: CouponKind; value: number; min_subtotal_cents: number; starts_at: string | null; ends_at: string | null; max_uses: number | null; uses: number; active: boolean; note: string };
  const { data: redemptions } = await supabase.from("coupon_redemptions").select("order_id, discount_cents, shipping_discount_cents, released, created_at").eq("coupon_id", id).order("created_at", { ascending: false }).limit(200);
  const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  return (
    <div>
      <Link href="/admin/cupons" className="text-sm text-black/60 hover:underline">← Cupons</Link>
      <h1 className="mb-6 mt-3 font-mono text-4xl tracking-[-0.03em]">{row.code}</h1>
      <CouponFormView
        initial={{
          id: row.id,
          code: row.code,
          kind: row.kind,
          percent: row.kind === "percentual" ? String(row.value) : "10",
          amount: row.kind === "valor_fixo" ? reais(row.value) : "",
          minSubtotal: row.min_subtotal_cents ? reais(row.min_subtotal_cents) : "",
          startsAt: toLocalInput(row.starts_at),
          endsAt: toLocalInput(row.ends_at),
          maxUses: row.max_uses ? String(row.max_uses) : "",
          active: row.active,
          note: row.note ?? "",
        }}
      />
      <section className="mt-8 rounded-2xl bg-white p-6">
        <h2 className="font-medium">Usos ({row.uses}{row.max_uses ? ` de ${row.max_uses}` : ""})</h2>
        <ul role="list" className="mt-4 divide-y divide-black/5 text-sm">
          {(redemptions ?? []).map((item) => (
            <li key={item.order_id as string} className="flex flex-wrap justify-between gap-3 py-2.5">
              <Link href={`/admin/pedidos/${encodeURIComponent(item.order_id as string)}`} className="font-mono underline underline-offset-4">{item.order_id as string}</Link>
              <span className="text-black/70">
                {item.discount_cents ? `−${formatPrice(item.discount_cents as number)}` : ""}
                {item.shipping_discount_cents ? ` frete −${formatPrice(item.shipping_discount_cents as number)}` : ""}
                {item.released ? " · devolvido (pedido cancelado)" : ""}
                {" · "}{new Date(item.created_at as string).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
              </span>
            </li>
          ))}
          {!redemptions?.length && <li className="py-4 text-black/60">Nenhum pedido usou este cupom ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
