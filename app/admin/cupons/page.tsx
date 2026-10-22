import Link from "next/link";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { couponBenefit, couponSituation, type CouponKind } from "@/lib/coupons";
import { formatPrice } from "@/lib/format";

type Row = { id: string; code: string; kind: CouponKind; value: number; min_subtotal_cents: number; starts_at: string | null; ends_at: string | null; max_uses: number | null; uses: number; active: boolean };
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "—");

const currentTime = () => Date.now();

// Cupons (operação, fase 1c): lista com usos, período e situação.
export default async function AdminCupons() {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("coupons").select("id, code, kind, value, min_subtotal_cents, starts_at, ends_at, max_uses, uses, active").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const now = currentTime();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl tracking-[-0.05em]">Cupons</h1>
        <Link href="/admin/cupons/novo" className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-[#b94f01]">Novo cupom</Link>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#b42318]/5 p-3 text-sm text-[#b42318]">Não foi possível carregar: {error.message}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-black/60">
            <tr><th className="p-4 font-medium">Código</th><th className="p-4 font-medium">Benefício</th><th className="p-4 font-medium">Mínimo</th><th className="p-4 font-medium">Período</th><th className="p-4 font-medium">Usos</th><th className="p-4 font-medium">Situação</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-4"><Link href={`/admin/cupons/${row.id}`} className="font-mono font-medium underline underline-offset-4">{row.code}</Link></td>
                <td className="p-4">{couponBenefit(row, formatPrice)}</td>
                <td className="p-4">{row.min_subtotal_cents ? formatPrice(row.min_subtotal_cents) : "—"}</td>
                <td className="p-4 text-xs text-black/70">{date(row.starts_at)} → {date(row.ends_at)}</td>
                <td className="p-4 tabular-nums">{row.uses}{row.max_uses ? ` / ${row.max_uses}` : ""}</td>
                <td className="p-4">{couponSituation(row, now)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-black/60">Nenhum cupom ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
