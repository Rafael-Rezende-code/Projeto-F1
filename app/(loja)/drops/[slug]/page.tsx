import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DropCountdown } from "@/components/drop-status";
import { DropWaitlistForm } from "@/components/drop-waitlist-form";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { isReleased, launchLabel } from "@/lib/drops";
import { getDrops } from "@/lib/drops-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Página do drop (loja extra, item 6): capa, contagem, produtos ("Em breve" até o lançamento) e lista de espera.
// Refeita a cada 5 min (e pelo painel ao salvar); a compra abre sozinha no lançamento (o navegador confere a hora e o
// servidor e o banco recusam antes dela).
export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };
const renderTime = () => Date.now();

async function load(slug: string) {
  return (await getDrops()).find((drop) => drop.slug === slug && drop.active) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const drop = await load((await params).slug);
  return drop ? { title: drop.title, description: drop.description.slice(0, 160) || `Lançamento ${launchLabel(drop.launchAt)}.` } : { title: "Drop não encontrado" };
}

export default async function DropPage({ params }: Props) {
  const drop = await load((await params).slug);
  if (!drop) notFound();
  const released = isReleased(drop, renderTime());
  const products = await catalog.getProductsBySlugs(drop.productSlugs);
  const ordered = drop.productSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product) => product !== undefined);
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Drops", href: "/drops" }, { label: drop.title }]} />
        <header className="relative mt-8 overflow-hidden rounded-2xl bg-[#111] text-white">
          {drop.cover && (
            <Image src={drop.cover} alt="" fill priority sizes="(min-width: 1400px) 1400px, 100vw" quality={75} unoptimized={!drop.cover.startsWith("/")} className="object-cover opacity-45" />
          )}
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">{drop.mode === "pre_venda" ? "Pré-venda" : "Drop"} · {released ? "lançado" : "em breve"}</p>
              <h1 className="mt-3 text-5xl font-medium tracking-[-0.06em] sm:text-7xl">{drop.title}</h1>
              {drop.description && <p className="mt-4 max-w-xl text-sm leading-7 text-white/75">{drop.description}</p>}
              <p className="mt-4 text-sm text-white/85">{released ? "Lançado em" : "Lançamento"} {launchLabel(drop.launchAt)} (horário de Brasília)</p>
              {drop.mode === "pre_venda" && drop.shipEstimate && <p className="mt-1 text-sm font-medium">Envio previsto: {drop.shipEstimate}</p>}
              {drop.perOrderLimit && <p className="mt-1 text-sm text-white/75">Limite de {drop.perOrderLimit} {drop.perOrderLimit === 1 ? "peça" : "peças"} por pedido.</p>}
            </div>
            {!released && <DropCountdown launchAt={drop.launchAt} dark />}
          </div>
        </header>

        <section aria-labelledby="drop-produtos" className="mt-14">
          <h2 id="drop-produtos" className="mb-8 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">Peças do drop</h2>
          {ordered.length ? <ProductGrid products={ordered} /> : <p className="rounded-2xl bg-[#f5f5f3] px-6 py-12 text-center text-sm text-black/60">As peças aparecem aqui no lançamento.</p>}
        </section>

        {!released && (
          <div className="mt-14 max-w-2xl">
            <DropWaitlistForm dropId={drop.id} enabled={isSupabaseConfigured()} />
          </div>
        )}
      </div>
    </div>
  );
}
