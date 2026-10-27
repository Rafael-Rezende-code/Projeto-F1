import Link from "next/link";
import { notFound } from "next/navigation";
import { KitFormView } from "@/components/admin/kit-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { kitOptions } from "../options";

export default async function EditarKit({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabase.from("kits").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as { id: string; slug: string; title: string; team_slug: string | null; driver_slug: string | null; product_slugs: string[]; discount_percent: number; active: boolean };
  return (
    <div>
      <Link href="/admin/kits" className="text-sm text-black/60 hover:underline">← Kits</Link>
      <h1 className="mb-6 mt-3 text-4xl tracking-[-0.05em]">{row.title}</h1>
      <KitFormView
        {...await kitOptions()}
        initial={{ id: row.id, slug: row.slug, title: row.title, teamSlug: row.team_slug ?? "", driverSlug: row.driver_slug ?? "", products: row.product_slugs, percent: String(row.discount_percent), active: row.active }}
      />
    </div>
  );
}
