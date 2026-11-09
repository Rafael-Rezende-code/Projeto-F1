import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PlayWhenVisible } from "@/components/campeao/play-when-visible";
import { CountUp } from "@/components/motion/count-up";
import { RevealGroup } from "@/components/motion/reveal-group";
import { ProductGrid } from "@/components/product-grid";
import { KitSection } from "@/components/kit-section";
import { NextRaceSlot } from "@/components/next-race-slot";
import { GoldBeamBorder, GoldRibbon, GoldSheen, GoldText } from "@/components/ui/gold";
import { CAMPEAO, CAMPEAO_FICHA, CAMPEAO_GALERIA, CAMPEAO_RECORDS, CAMPEAO_TIMELINE, type CampeaoFoto } from "@/lib/campeao";
import { blurProps } from "@/lib/local-images";
import type { Product } from "@/lib/catalog/types";

// FICHA DO CAMPEÃO (feat/antonelli-2): a página /pilotos/antonelli. Topo com a bandeira em tela cheia (sem coroa e sem o
// texto da F1 de cima), nome dourado e a fita "Campeão Mundial 2026"; faixa de até 4 números (2+ fontes cada); linha do
// tempo com fio dourado; galeria em mosaico; "Coleção do Kimi" (tag `antonelli`, com "Em breve" sem produto); e o card
// "Reviva a coroação" para /campeao. Fatos: docs/conteudo/antonelli.md. Fotos: docs/conteudo/imagens.md.
// Dourado só aqui e nos cards do Kimi. Animações: só transform/opacity, pausadas fora da tela (PlayWhenVisible).

const GALLERY_AREA: Record<CampeaoFoto["area"], string> = {
  grande: "lg:col-[1/6] lg:row-[1/3]",
  alta: "lg:col-[6/9] lg:row-[1/3]",
  "larga-1": "lg:col-[9/13] lg:row-[1/2]",
  "larga-2": "lg:col-[9/13] lg:row-[2/3]",
};
// Largura de cada foto no mosaico (para `sizes`), em 1400 px de conteúdo: 5, 3 e 4 de 12 colunas; abaixo de 1024px, metade
// ou a largura toda.
const GALLERY_SIZES: Record<CampeaoFoto["area"], string> = {
  grande: "(min-width: 1480px) 580px, (min-width: 1024px) 40vw, 100vw",
  alta: "(min-width: 1480px) 345px, (min-width: 1024px) 24vw, 50vw",
  "larga-1": "(min-width: 1480px) 460px, (min-width: 1024px) 32vw, 50vw",
  "larga-2": "(min-width: 1480px) 460px, (min-width: 1024px) 32vw, 100vw",
};

export function FichaCampeao({ products, driverSlug }: { products: Product[]; driverSlug: string }) {
  const hero = CAMPEAO_FICHA.hero;
  const colecao = CAMPEAO_FICHA.colecao;
  const reviva = CAMPEAO_FICHA.reviva;
  return (
    <div className="pb-24">
      {/* ---- Topo: bandeira em tela cheia (LCP: priority) ---- */}
      <section aria-labelledby="ficha-nome" className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col justify-between overflow-hidden bg-[#0b0b0c] text-white md:min-h-[calc(100svh-5.5rem)]">
        <Image
          src={hero.image.src}
          alt={hero.image.alt}
          fill
          priority
          sizes={hero.sizes}
          quality={85}
          className="-z-10 object-cover"
          style={{ objectPosition: hero.image.position }}
          {...blurProps(hero.image.src)}
        />
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c]/50 via-40% to-[#0b0b0c]/25" />
        <div className="mx-auto w-full max-w-[1400px] px-5 pt-8 sm:px-10 sm:pt-10">
          <Breadcrumbs tone="light" color="#ffffff" items={[{ label: "Início", href: "/" }, { label: "Pilotos", href: "/pilotos" }, { label: CAMPEAO.name }]} />
        </div>
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(var(--dock-space)+2rem)] sm:px-10 sm:pb-16">
          <div className="enter-block">
            <GoldRibbon>{hero.ribbon}</GoldRibbon>
          </div>
          <GoldText as="h1" className="enter-title mt-6 block text-[clamp(3.25rem,12vw,10rem)] leading-[0.88] tracking-[-0.05em]">
            <span id="ficha-nome">
              Kimi <span className="block">Antonelli</span>
            </span>
          </GoldText>
          <p className="enter-block mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85 sm:text-base">
            <Link href="/equipes/mercedes" className="underline decoration-[#c8962c] underline-offset-4 hover:text-white">
              {hero.line.split(" · ")[0]}
            </Link>
            <span aria-hidden="true" className="text-[#e8c36a]">·</span>
            <span>{hero.line.split(" · ")[1]}</span>
            <span aria-hidden="true" className="text-[#e8c36a]">·</span>
            <span>O mais jovem campeão da história.</span>
          </p>
        </div>
      </section>

      {/* ---- Números (no máximo 4, todos com 2+ fontes) + linha do tempo + galeria: fundo escuro ---- */}
      <div className="bg-[#0b0b0c] px-5 text-white sm:px-10">
        <section aria-labelledby="ficha-numeros" className="mx-auto max-w-[1400px] border-t border-[#c8962c]/30 py-16 sm:py-20">
          <h2 id="ficha-numeros" className="sr-only">Os números do título</h2>
          <dl className="grid gap-px overflow-hidden rounded-2xl bg-[#c8962c]/25 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPEAO_RECORDS.slice(0, 4).map((item) => (
              <div key={item.label} className="flex flex-col bg-[#0b0b0c] p-6 sm:p-8">
                <dt className="order-2 mt-3 max-w-[30ch] text-sm leading-6 text-white/75">{item.label}</dt>
                <dd className="order-1 flex items-baseline gap-2">
                  <CountUp value={item.value} className="gold-text font-display inline-block text-6xl tracking-[-0.05em] sm:text-7xl" />
                  {item.unit && <span className="text-sm uppercase tracking-[0.18em] text-[#e8c36a]">{item.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="ficha-trajetoria" className="mx-auto grid max-w-[1400px] gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <p className="font-ouro-serif text-2xl text-[#e8c36a]">Linha do tempo</p>
            <h2 id="ficha-trajetoria" className="mt-3 text-4xl tracking-[-0.05em] sm:text-5xl">
              Até a coroa.
            </h2>
          </div>
          <div className="relative">
            <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-[#e8c36a] via-[#c8962c] to-[#5c4310]" />
            <RevealGroup as="ol" className="grid gap-10">
              {CAMPEAO_TIMELINE.map((item) => (
                <li key={item.title} className="relative pl-10">
                  <span aria-hidden="true" className="absolute left-0 top-1 grid size-[15px] place-items-center rounded-full border border-[#e8c36a] bg-[#0b0b0c]">
                    <span className="size-[7px] rounded-full bg-[#e8c36a]" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c36a]">{item.date}</p>
                  <h3 className="mt-2 text-2xl font-medium tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-2 max-w-[52ch] text-sm leading-6 text-white/75 sm:text-base sm:leading-7">{item.text}</p>
                </li>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section aria-labelledby="ficha-galeria" className="mx-auto max-w-[1400px] pb-20 sm:pb-28">
          <p className="font-ouro-serif text-2xl text-[#e8c36a]">Galeria</p>
          <h2 id="ficha-galeria" className="mt-3 text-4xl tracking-[-0.05em] sm:text-5xl">
            O ano do campeão.
          </h2>
          <RevealGroup className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-12 lg:grid-rows-[repeat(2,minmax(0,clamp(220px,21vw,300px)))]">
            {CAMPEAO_GALERIA.map((photo) => (
              <li key={photo.src} className={`${photo.span ? "col-span-2" : ""} ${GALLERY_AREA[photo.area]}`}>
                <figure className="group relative isolate aspect-(--ratio) h-full overflow-hidden rounded-2xl bg-[#1a1a1a] lg:aspect-auto" style={{ "--ratio": photo.ratio } as React.CSSProperties}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes={GALLERY_SIZES[photo.area]}
                    quality={85}
                    className="object-cover opacity-90 transition-[transform,opacity] duration-[var(--motion-long)] ease-[var(--ease-out)] group-hover:scale-[1.03] group-hover:opacity-100"
                    style={{ objectPosition: photo.position }}
                    {...blurProps(photo.src)}
                  />
                </figure>
              </li>
            ))}
          </RevealGroup>
        </section>
      </div>

      {/* ---- Coleção do Kimi (tag `antonelli`) ---- */}
      <section aria-labelledby="ficha-colecao" id="colecao-do-kimi" className="scroll-mt-24 bg-[#f5f5f3] px-5 py-20 text-black sm:px-10 sm:py-28">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5c4310]">{colecao.eyebrow}</p>
          {products.length > 0 ? (
            <>
              <div className="mb-10 mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div>
                  <h2 id="ficha-colecao" className="text-4xl tracking-[-0.05em] sm:text-5xl">{colecao.title}</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-black/65">{colecao.body}</p>
                </div>
                <Link href={`/produtos?q=${CAMPEAO.tag}`} className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/65 underline-offset-4 transition hover:text-black hover:underline">
                  Ver todos os produtos <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <ProductGrid products={products} priorityCount={0} layout="colecao" />
            </>
          ) : (
            <PlayWhenVisible className="gold-anim mt-6">
              <GoldBeamBorder innerClassName="relative px-6 py-14 text-center text-white sm:px-12 sm:py-20" beamSize="320%">
                <GoldSheen />
                <h2 id="ficha-colecao" className="font-ouro-serif gold-text text-5xl sm:text-7xl">
                  {colecao.emptyTitle}
                </h2>
                <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/80">{colecao.emptyBody}</p>
                <div className="relative z-[3] mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/#newsletter" className="inline-flex min-h-11 items-center rounded-xl bg-[linear-gradient(100deg,var(--ouro-escuro),var(--ouro)_35%,var(--ouro-claro)_60%,var(--ouro))] px-6 py-3 text-sm font-semibold text-[#1a1306] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c36a]">
                    Quero saber primeiro
                  </Link>
                  <Link href="/equipes/mercedes" className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-[#e8c36a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c36a]">
                    Ver a coleção Mercedes
                  </Link>
                </div>
              </GoldBeamBorder>
            </PlayWhenVisible>
          )}
          <KitSection driverSlug={driverSlug} className="mt-16" />
          <NextRaceSlot className="mt-6" />
        </div>
      </section>

      {/* ---- Reviva a coroação ---- */}
      <section aria-labelledby="ficha-reviva" className="px-5 pt-16 sm:px-10 sm:pt-20">
        <PlayWhenVisible className="gold-anim mx-auto max-w-[1400px]">
          <GoldBeamBorder beamSize="320%" innerClassName="relative bg-[radial-gradient(120%_140%_at_85%_0%,rgba(200,150,44,0.28),transparent_55%)] px-6 py-14 text-white sm:px-14 sm:py-20">
            <GoldSheen />
            <div className="relative z-[3] flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-ouro-serif text-2xl text-[#e8c36a] sm:text-3xl">{reviva.eyebrow}</p>
                <GoldText as="h2" className="mt-3 block text-5xl tracking-[-0.05em] sm:text-7xl">
                  <span id="ficha-reviva">{reviva.title}</span>
                </GoldText>
                <p className="mt-5 max-w-md text-base leading-7 text-white/80">{reviva.body}</p>
              </div>
              <Link href={CAMPEAO.href} className="group inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-xl bg-[linear-gradient(100deg,var(--ouro-escuro),var(--ouro)_35%,var(--ouro-claro)_60%,var(--ouro))] px-7 py-3 text-sm font-semibold text-[#1a1306] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c36a] md:self-auto">
                {reviva.cta} <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </GoldBeamBorder>
        </PlayWhenVisible>
      </section>
    </div>
  );
}
