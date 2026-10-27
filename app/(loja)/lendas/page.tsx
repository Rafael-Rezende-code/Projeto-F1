import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LegendArt } from "@/components/legend-art";
import { PageIntro } from "@/components/page-intro";
import { RevealGroup } from "@/components/motion/reveal-group";
import { legends } from "@/lib/content/legends";

export const metadata: Metadata = {
  title: "Lendas",
  description: "Senna, Fittipaldi, Piquet, Schumacher, Prost, Lauda, Fangio e Clark: homenagem de fãs a quem fez a história da Fórmula 1.",
  alternates: { canonical: "/lendas" },
};

// Hub "Lendas" (loja extra, item 7): os 8 nomes, cada um com a sua página.
export default function LendasPage() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Lendas" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Pilotos históricos" title="Lendas" body="Homenagem de fãs a quem fez a história da Fórmula 1. Textos independentes, sem vínculo com os pilotos, as famílias ou as equipes." />
        </div>
        <RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {legends.map((legend, index) => (
            <li key={legend.slug}>
              <Link href={`/lendas/${legend.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                <LegendArt legend={legend} sizes="(min-width: 1024px) 25vw, 50vw" priority={index < 4} className="@container flex aspect-[4/5] items-end rounded-2xl transition-transform duration-[var(--motion-medium)] ease-[var(--ease-out)] group-hover:-translate-y-1">
                  <div className="w-full p-4 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 [overflow-wrap:anywhere]">{legend.country} · {legend.years}</p>
                    <p className="font-display mt-2 text-[min(13cqw,3rem)] leading-none">{legend.shortName}</p>
                  </div>
                </LegendArt>
              </Link>
            </li>
          ))}
        </RevealGroup>
      </div>
    </div>
  );
}
