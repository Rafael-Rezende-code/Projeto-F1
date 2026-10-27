import Link from "next/link";
import { notFound } from "next/navigation";
import { DropFormView, NotifyWaitlist } from "@/components/admin/drop-form";
import { adminDisabled, requireAdmin } from "@/lib/admin/auth";
import { catalog } from "@/lib/catalog";
import { utcToZoned } from "@/lib/calendar";
import { isEmailConfigured } from "@/lib/email";

const currentTime = () => Date.now();
const date = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Editar drop + lista de espera (CSV e aviso de lançamento).
export default async function EditarDrop({ params }: { params: Promise<{ id: string }> }) {
  if (adminDisabled()) return null;
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabase.from("drops").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as { id: string; slug: string; title: string; description: string; cover: string | null; launch_at: string; mode: "lancamento" | "pre_venda"; ship_estimate: string | null; per_order_limit: number | null; product_slugs: string[]; active: boolean };
  const [{ data: waitlist }, { data: notified }, products] = await Promise.all([
    supabase.from("drop_waitlist").select("email, created_at").eq("drop_id", id).order("created_at", { ascending: false }).limit(500),
    supabase.from("drop_notifications").select("email, status").eq("drop_id", id).limit(5000),
    catalog.getProducts(),
  ]);
  const statusOf = new Map((notified ?? []).map((item: { email: string; status: string }) => [item.email, item.status]));
  const released = currentTime() >= new Date(row.launch_at).getTime();
  return (
    <div>
      <Link href="/admin/drops" className="text-sm text-black/60 hover:underline">← Drops</Link>
      <h1 className="mb-6 mt-3 text-4xl tracking-[-0.05em]">{row.title}</h1>
      <DropFormView
        products={products.map((product) => ({ slug: product.slug, name: product.name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
        initial={{
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description,
          cover: row.cover ?? "",
          launchLocal: utcToZoned(row.launch_at, "America/Sao_Paulo"),
          mode: row.mode,
          shipEstimate: row.ship_estimate ?? "",
          perOrderLimit: row.per_order_limit ? String(row.per_order_limit) : "",
          products: row.product_slugs,
          active: row.active,
        }}
      />
      <section className="mt-8 rounded-2xl bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">Lista de espera ({waitlist?.length ?? 0})</h2>
            <p className="mt-1 text-xs text-black/60">E-mails com consentimento para o aviso de lançamento deste drop.</p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <a href={`/admin/drops/${row.id}/lista`} className="rounded-xl border border-black/15 px-5 py-3 text-sm hover:border-black">Baixar CSV</a>
            <NotifyWaitlist dropId={row.id} enabled={isEmailConfigured()} released={released} />
          </div>
        </div>
        <ul role="list" className="mt-4 divide-y divide-black/5 text-sm">
          {(waitlist ?? []).map((item: { email: string; created_at: string }) => (
            <li key={item.email} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{item.email}</span>
              <span className="text-xs text-black/60">{date(item.created_at)} · {statusOf.get(item.email) === "enviado" ? "avisado" : statusOf.get(item.email) === "falhou" ? "falhou" : "aguardando"}</span>
            </li>
          ))}
          {!waitlist?.length && <li className="py-6 text-center text-black/60">Ninguém na lista ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
