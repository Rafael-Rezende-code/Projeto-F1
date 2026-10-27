import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LegendArt } from "@/components/legend-art";
import { RevealGroup } from "@/components/motion/reveal-group";
import { legendTag, legends, type Legend } from "@/lib/content/legends";
import type { Product } from "@/lib/catalog/types";

// Bloco "Lendas" da home (loja extra, item 7): só as lendas que já têm produto publicado (tag lenda-{slug}); se
// nenhuma tiver, as 4 primeiras.
export function homeLegends(products: Product[]): Legend[] {
  const withProducts = legends.filter((legend) => products.some((product) => product.tags.includes(legendTag(legend.slug))));
  return withProducts.length ? withProducts.slice(0, 4) : legends.slice(0, 4);
}

export function LegendsHome({ items }: { items: Legend[] }) {
  return (
    <section id="lendas" aria-labelledby="lendas-titulo" className="scroll-mt-20 px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Pilotos históricos</p>
            <h2 id="lendas-titulo" className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">Lendas</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-black/60">Quem fez a história da Fórmula 1, contado por fãs.</p>
          </div>
          <Link href="/lendas" className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">
            Ver todas as lendas <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((legend) => (
            <li key={legend.slug}>
              <Link href={`/lendas/${legend.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                <LegendArt legend={legend} sizes="(min-width: 1024px) 25vw, 50vw" className="@container flex aspect-[4/5] items-end rounded-2xl transition-transform duration-[var(--motion-medium)] ease-[var(--ease-out)] group-hover:-translate-y-1">
                  <div className="w-full p-4 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{legend.country} · {legend.years.split(", ").map((range, i) => <span key={range}>{i ? ", " : ""}<span className="whitespace-nowrap">{range}</span></span>)}</p>
                    <p className="font-display mt-2 text-[min(12cqw,3rem)] leading-none">{legend.shortName}</p>
                  </div>
                </LegendArt>
              </Link>
            </li>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
