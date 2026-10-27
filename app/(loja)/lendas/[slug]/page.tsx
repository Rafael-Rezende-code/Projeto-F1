import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LegendArt } from "@/components/legend-art";
import { RevealLines } from "@/components/motion/reveal-text";
import { ProductGrid } from "@/components/product-grid";
import { catalog } from "@/lib/catalog";
import { articles } from "@/lib/content/diario";
import { getLegend, legends, legendTag } from "@/lib/content/legends";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";

// Página de uma lenda (loja extra, item 7). Ordem: topo (nome grande com a animação de texto do site) → PRODUTOS (tag
// lenda-{slug}; sem produtos, "Em breve" com newsletter e Diário) → história e números → curiosidades → "Leia também".
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return legends.map((legend) => ({ slug: legend.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const legend = getLegend((await params).slug);
  if (!legend) return {};
  return { title: `${legend.name}: lenda da Fórmula 1`, description: legend.opening, alternates: { canonical: `/lendas/${legend.slug}` } };
}

export default async function LendaPage({ params }: Props) {
  const legend = getLegend((await params).slug);
  if (!legend) notFound();
  const products = await catalog.getProducts({ collection: { tags: [legendTag(legend.slug)] } });
  const related = (legend.articles ?? []).map((slug) => articles.find((article) => article.slug === slug)).filter((article) => article !== undefined);
  const others = legends.filter((item) => item.slug !== legend.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: legend.name,
    birthDate: legend.born,
    ...(legend.died ? { deathDate: legend.died } : {}),
    nationality: legend.country,
    jobTitle: "Piloto de Fórmula 1",
    description: legend.opening,
    url: `${SITE_URL}/lendas/${legend.slug}`,
    subjectOf: { "@type": "WebPage", name: `${legend.name} | ${BRAND.name}`, url: `${SITE_URL}/lendas/${legend.slug}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <LegendArt legend={legend} priority className="min-h-[70svh]">
        <div className="mx-auto flex min-h-[70svh] max-w-[1400px] flex-col justify-between px-5 pb-12 pt-8 sm:px-10 sm:pb-16 sm:pt-10">
          <Breadcrumbs tone="light" color="#ffffff" items={[{ label: "Início", href: "/" }, { label: "Lendas", href: "/lendas" }, { label: legend.name }]} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Lenda · {legend.country} · {legend.years}</p>
            <RevealLines as="h1" className="mt-4 text-[clamp(3rem,15vw,10rem)] font-medium leading-[0.9] tracking-[-0.07em] [overflow-wrap:anywhere]" lines={legend.name.split(" ").map((word) => ({ text: word, className: "block" }))} />
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">{legend.opening}</p>
          </div>
        </div>
      </LegendArt>

      <div className="px-5 pb-24 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <section aria-labelledby="lenda-produtos" className="pt-16 sm:pt-20">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Coleção</p>
            <h2 id="lenda-produtos" className="mb-10 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">Peças em homenagem a {legend.shortName}</h2>
            {products.length ? (
              <ProductGrid products={products} priorityCount={4} />
            ) : (
              <div className="rounded-2xl bg-[#f5f5f3] px-6 py-14 text-center text-black" data-em-breve>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Em breve</p>
                <p className="mx-auto mt-3 max-w-md text-2xl font-medium tracking-[-0.05em]">As peças em homenagem a {legend.shortName} estão a caminho.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/#newsletter" className="inline-flex min-h-11 items-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-[#b94f01]">Avise-me pela newsletter</Link>
                  <Link href="/diario" className="inline-flex min-h-11 items-center rounded-xl border border-black/15 px-6 text-sm font-medium transition hover:border-black">Ler o Diário</Link>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="lenda-historia" className="mt-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-20">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Trajetória</p>
              <h2 id="lenda-historia" className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl">A história de {legend.shortName}</h2>
              <div className="mt-8 max-w-[65ch] space-y-5 text-[17px] leading-8 text-black/80">
                {legend.trajectory.map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
              </div>
            </div>
            <dl className="grid content-start gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {legend.milestones.map((milestone) => (
                <div key={milestone.label} className="flex flex-col border-t-2 pt-4" style={{ borderColor: legend.color }}>
                  <dt className="order-2 mt-2 text-sm leading-6 text-black/70">{milestone.label}</dt>
                  <dd className="font-display order-1 text-5xl leading-none tracking-[-0.04em] text-black">{milestone.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="lenda-curiosidades" className="mt-20">
            <h2 id="lenda-curiosidades" className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl">Curiosidades</h2>
            <ul role="list" className="mt-8 grid gap-3 md:grid-cols-3">
              {legend.curiosities.map((item, index) => (
                <li key={item.slice(0, 24)} className="rounded-2xl bg-[#f5f5f3] p-6 text-[15px] leading-7 text-black/80">
                  <span className="font-display mb-3 block text-2xl text-[#b94f01]">{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-black/60">Texto editorial independente, escrito por fãs. Sem vínculo com o piloto, a família ou as equipes. Fontes em docs/conteudo/fontes-lendas.md.</p>
          </section>

          <section aria-labelledby="lenda-leia" className="mt-20">
            <h2 id="lenda-leia" className="mb-8 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">Leia também</h2>
            <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((article) => (
                <li key={article.slug}>
                  <Link href={`/diario/${article.slug}`} className="group block h-full rounded-2xl bg-[#f5f5f3] p-3 text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                    <div className="relative isolate aspect-[4/3] overflow-hidden rounded-xl bg-[#e9e8e4]">
                      <Image src={article.cover.src} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" quality={75} className="hover-zoom object-cover" style={{ objectPosition: article.cover.position }} />
                    </div>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b94f01]">Diário</p>
                    <p className="mt-1 font-medium">{article.title}</p>
                  </Link>
                </li>
              ))}
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/lendas/${other.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
                    <LegendArt legend={other} sizes="(min-width: 1024px) 25vw, 50vw" className="@container flex aspect-[4/3] items-end rounded-2xl">
                      <div className="flex w-full items-end justify-between gap-2 p-4">
                        <span>
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">Lenda</span>
                          <span className="font-display block text-[min(11cqw,1.875rem)] leading-none">{other.shortName}</span>
                        </span>
                        <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </LegendArt>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
