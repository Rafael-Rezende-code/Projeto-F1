import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { isReleased, launchLabel, visibleDrops } from "@/lib/drops";
import { getDrops } from "@/lib/drops-store";

export const metadata: Metadata = { title: "Drops", description: "Lançamentos com data marcada e pré-vendas." };
export const revalidate = 300;
const renderTime = () => Date.now();

// Índice dos drops (loja extra, item 6): os futuros e os lançados há até 30 dias.
export default async function DropsPage() {
  const now = renderTime();
  const drops = visibleDrops(await getDrops(), now);
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Drops" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Lançamentos" title="Drops" body="Peças com data marcada. Antes do lançamento, entre na lista de espera e receba o aviso na hora." />
        </div>
        {drops.length ? (
          <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drops.map((drop) => {
              const released = isReleased(drop, now);
              return (
                <li key={drop.slug}>
                  <Link href={`/drops/${drop.slug}`} className="group flex h-full min-h-48 flex-col justify-between rounded-2xl bg-[#111] p-6 text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">{drop.mode === "pre_venda" ? "Pré-venda" : "Drop"} · {released ? "lançado" : "em breve"}</span>
                    <span>
                      <span className="block text-2xl font-medium tracking-[-0.04em]">{drop.title}</span>
                      <span className="mt-2 flex items-center gap-2 text-sm text-white/75">{launchLabel(drop.launchAt)} <ArrowRight size={14} aria-hidden="true" className="hover-arrow" /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl bg-[#f5f5f3] px-6 py-16 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pista livre</p>
            <h2 className="mt-3 text-2xl font-medium tracking-[-0.05em]">Nenhum drop marcado agora.</h2>
            <p className="mt-3 text-sm leading-6 text-black/60">Assine a newsletter para saber do próximo lançamento.</p>
            <Link href="/#newsletter" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-[#b94f01]">Assinar a newsletter</Link>
          </div>
        )}
      </div>
    </div>
  );
}
