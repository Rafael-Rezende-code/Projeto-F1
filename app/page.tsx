import { homeLegends, LegendsHome } from '@/components/legends-home'
import { DropsHome } from '@/components/drops-home'
import { visibleDrops } from '@/lib/drops'
import { getDrops } from '@/lib/drops-store'
import { navExtras } from '@/lib/nav-extras'
import { NextRace } from '@/components/next-race'
import { isRaceWeek, nextRace } from '@/lib/calendar'
import { getRaceWeekends } from '@/lib/calendar-store'
import { ArrowRight, ArrowUpRight, Gift } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { DriversSection } from '@/components/drivers-section'
import { driverCardBlurs } from '@/lib/driver-card-blurs'
import { RevealGroup } from '@/components/motion/reveal-group'
import { RevealLines, RevealText } from '@/components/motion/reveal-text'
import { SectionTitle } from '@/components/motion/section-title'
import { NewsletterForm } from '@/components/newsletter-form'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Spotlight } from '@/components/spotlight'
import { TeamCard } from '@/components/team-card'
import { TeamMarquee } from '@/components/team-marquee'
import { VelocidadePortal } from '@/components/velocidade-portal'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { ArtDirectedImage } from '@/components/ui/art-directed-image'
import { ImageReveal } from '@/components/motion/image-reveal'
import { blurProps, localImage } from '@/lib/local-images'
import { KineticText } from '@/components/ui/kinetic-text'
import { editorial, editorialQuality } from '@/lib/editorial'
import { BRAND } from '@/lib/brand'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { AuthErrorRedirect } from '@/components/auth-error-redirect'
import { BenefitsStrip } from '@/components/benefits-strip'
import { HERO_FONT_SCRIPT } from '@/lib/hero'
import { catalog } from '@/lib/catalog'
import { collectionsWithProducts } from '@/lib/catalog/collections'
import { giftBandCounts } from '@/lib/catalog/gifts'
import { CollectionCard } from '@/components/collection-card'
import { ProductGrid } from '@/components/product-grid'
import { teams } from '@/lib/teams'

const BASE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png'
const REVEAL_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_24-BobebdPiCa5YmPt5HBNd0l081R6lej.png'
function SectionIntro({ eyebrow, title, body, highlight }: { eyebrow: string; title: string; body: string; highlight?: string }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">{eyebrow}</p><SectionTitle text={title} highlight={highlight} className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl md:text-6xl" /><p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-black/55 sm:text-base">{body}</p></div>
}

// Cabeçalho das vitrines de produto da home (rótulo, título, frase e link "ver todos").
function ShelfHeader({ id, eyebrow, title, body, href, linkLabel }: { id: string; eyebrow: string; title: string; body?: string; href: string; linkLabel: string }) {
  return <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">{eyebrow}</p><SectionTitle id={id} text={title} className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl" />{body && <p className="mt-4 max-w-md text-sm leading-6 text-black/60">{body}</p>}</div><Link href={href} className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">{linkLabel} <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></Link></div>
}

// "Mais vendidos" usa as vendas reais (Supabase): a home é regenerada a cada hora (ISR); com o seed nada muda.
export const revalidate = 3600

// Hora da renderização (a página revalida de hora em hora): escolhe a próxima corrida e a semana de corrida.
const renderTime = () => Date.now()

export default async function Page() {
  const [allProducts, bestsellers, races, drops] = await Promise.all([catalog.getProducts(), catalog.getBestsellers(8), getRaceWeekends(), getDrops()])
  // Semana de corrida (loja extra, item 5): sem corrida futura, nada; de sexta a segunda, o bloco sobe para logo depois do hero.
  const now = renderTime()
  const race = nextRace(races, now)
  const raceBlock = race ? <div className="px-5 pt-10 sm:px-10 sm:pt-14"><NextRace race={race} now={now} className="mx-auto max-w-[1400px]" /></div> : null
  const raceWeek = isRaceWeek(race, now)
  // Drops (loja extra, item 6): bloco só com drop ativo ou futuro.
  const homeDrops = visibleDrops(drops, now)
  // Ordem da home (refino 3, docs/refino-3/home.md): cada produto aparece em UMA vitrine só. Mais vendidos (curadoria +
  // vendas reais; lib/catalog/curation.ts) → Novidades (selo NOVO, sem os que já estão em Mais vendidos) → VELOCIDADE
  // (destaques que ainda não apareceram; se faltar, os destaques de sempre).
  const shown = new Set(bestsellers.map((product) => product.id))
  const newest = allProducts.filter((product) => product.isNew && !shown.has(product.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  newest.forEach((product) => shown.add(product.id))
  const featured = allProducts.filter((product) => product.featured)
  const velocidadeProducts = [...featured.filter((product) => !shown.has(product.id)), ...featured.filter((product) => shown.has(product.id))].slice(0, 3)
  const homeCollections = collectionsWithProducts(allProducts).slice(0, 4)
  const gifts = giftBandCounts(allProducts).filter((band) => band.count > 0)
  return <main id="top" className="min-h-screen bg-white">
    <AuthErrorRedirect />
    <SiteHeader variant="overlay" extraLinks={await navExtras()} />
    <section className="hero-type relative h-screen w-full overflow-hidden bg-black" style={{ height: '100dvh' }}>
      <script dangerouslySetInnerHTML={{ __html: HERO_FONT_SCRIPT }} />
      <Spotlight image={REVEAL_IMAGE} base={BASE_IMAGE} /><div className="absolute inset-0 z-20 bg-gradient-to-b from-black/30 via-transparent to-black/45" /><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-[55%] bg-gradient-to-t from-black/70 via-black/30 to-transparent sm:h-[45%] sm:from-black/55" />
      <div className="pointer-events-none absolute left-0 right-0 top-[14%] z-50 flex flex-col items-center px-5 text-center text-white"><h1 className="leading-[0.95]" style={{ fontSize: '14px' }}><span className="hero-serif block text-5xl font-normal italic sm:text-7xl md:text-8xl" style={{ letterSpacing: '-0.05em' }}>Feita para</span><span className="mt-[-0.08em] block text-5xl font-normal italic sm:text-7xl md:text-8xl" style={{ letterSpacing: '-0.08em' }}>pilotos</span></h1></div>
      <p className="absolute bottom-14 left-10 z-50 hidden max-w-[260px] text-sm leading-relaxed text-white/80 md:left-14 sm:block">Cada milissegundo é projetado. Das superfícies aerodinâmicas às unidades de potência construídas com precisão, a Fórmula 1 é onde tecnologia, velocidade e habilidade humana encontram o limite.</p><div className="absolute bottom-[calc(var(--dock-space)+2.5rem)] left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:left-auto sm:right-10 sm:max-w-[260px] sm:gap-5 md:right-14"><p className="text-xs leading-relaxed text-white/90 sm:text-sm">Explore camisetas premium de Fórmula 1, memorabilia das pistas, colecionáveis e peças inspiradas nas máquinas e equipes que definem o automobilismo.</p><a href="#collection" className="group inline-flex items-center gap-3 rounded-xl bg-[#b94f01] px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:bg-[#9f4300] active:scale-95">Ver coleção <ArrowUpRight /></a></div><div className="absolute bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 lg:flex"><span className="h-px w-8 bg-white/50" /> Pilotos <span className="h-px w-8 bg-white/50" /></div>
    </section>

    <BenefitsStrip />

    {raceWeek && raceBlock}

    <DriversSection blurs={driverCardBlurs()} />

    <TeamMarquee />

    <section id="mais-vendidos" aria-labelledby="mais-vendidos-titulo" className="scroll-mt-20 bg-[#f5f5f3] px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><ShelfHeader id="mais-vendidos-titulo" eyebrow="O que o grid veste" title="Mais vendidos" body="As peças às quais a comunidade sempre volta." href="/produtos" linkLabel="Ver todos os produtos" /><ProductGrid products={bestsellers} /></div></section>

    {homeDrops.length > 0 && <DropsHome drops={homeDrops} now={now} />}

    <section id="collection" className="px-5 pb-20 pt-16 sm:px-10 sm:pb-28 sm:pt-20"><SectionIntro eyebrow="Explore a coleção" title="Feita em torno da corrida." highlight="corrida" body="Dos essenciais do dia de prova às peças colecionáveis, descubra produtos de Fórmula 1 para quem vive pela próxima volta." /><RevealGroup className="mx-auto mt-14 grid max-w-[1400px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{homeCollections.map(({ collection }, index) => <li key={collection.slug}><CollectionCard href={`/colecoes/${collection.slug}`} eyebrow={String(index + 1).padStart(2, "0")} title={collection.title} subtitle={collection.phrase} image={collection.cover} /></li>)}</RevealGroup><p className="mx-auto mt-8 max-w-[1400px] text-center"><Link href="/colecoes" className="group inline-flex min-h-11 items-center gap-2 text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">Ver todas as coleções <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></Link></p></section>

    {newest.length > 0 && <section id="novidades" aria-labelledby="novidades-titulo" className="scroll-mt-20 px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><ShelfHeader id="novidades-titulo" eyebrow="Acabou de chegar" title="Novidades" body="Os lançamentos mais recentes do grid." href="/produtos?ordem=novidades" linkLabel="Ver novidades" /><ProductGrid products={newest} /></div></section>}

    {!raceWeek && raceBlock}

    <section id="story" className="relative flex min-h-[650px] items-center overflow-hidden bg-[#090909] px-5 py-24 text-white sm:px-10"><ImageReveal blur={localImage(editorial.story.mobile.src)?.blur} className="absolute inset-0 opacity-65"><ArtDirectedImage alt={editorial.story.alt} mobile={editorial.story.mobile} desktop={editorial.story.desktop} quality={editorialQuality} className="object-cover" /></ImageReveal><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" /><div className="relative z-10 mx-auto w-full max-w-[1400px]"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A cultura da velocidade</p><RevealLines className="max-w-3xl text-5xl font-medium leading-[0.92] tracking-[-0.07em] sm:text-6xl md:text-8xl" lines={[{ text: "Mais que uma corrida.", className: "block" }, { text: "Um jeito de viver.", className: "font-playfair block italic" }]} /><RevealText className="mt-8 max-w-md text-sm leading-7 text-white/65" text={"As máquinas, as equipes, os circuitos e os momentos que transformam cada fim de semana de corrida em algo inesquecível."} /><a href="#journal" className="mt-9 inline-flex items-center gap-3 rounded-xl border border-white/40 px-5 py-3 text-xs font-medium transition hover:border-white hover:bg-white hover:text-black">Explore o mundo da F1 <ArrowUpRight size={16} /></a></div></section>

    <section id="teams" className="px-5 py-20 sm:px-10 sm:py-28"><SectionIntro eyebrow="Escolha sua equipe" title="Com quem você corre?" body="Roupas e colecionáveis inspirados nas equipes que definem o grid." />{/* 11 equipes: 4 + 4 + 3 centralizado (desktop/tablet); 2 por linha no celular; a última, sozinha, em largura total. */}<RevealGroup role="list" className="mx-auto mt-14 flex max-w-[1200px] flex-wrap justify-center gap-3">{teams.map((team, index) => { const wide = teams.length % 2 === 1 && index === teams.length - 1; return <li key={team.slug} className={`${wide ? "w-full" : "w-[calc(50%-6px)]"} sm:w-[calc(25%-9px)]`}><TeamCard team={team} wideOnMobile={wide} /></li> })}</RevealGroup></section>

    <section className="grid min-h-[620px] grid-cols-1 bg-[#111] text-white lg:grid-cols-2"><ImageReveal className="relative min-h-[380px]"><Image src={editorial.detail.mobile.src} alt={editorial.detail.alt} fill sizes={editorial.detail.mobile.sizes} quality={editorialQuality} className="object-cover" style={{ objectPosition: editorial.detail.mobile.position }} {...blurProps(editorial.detail.mobile.src)} /></ImageReveal><div className="flex items-center px-6 py-20 sm:px-14 lg:px-20"><div className="max-w-lg"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Obsessão projetada</p><SectionTitle text="Cada detalhe importa." highlight="detalhe" className="text-5xl font-medium tracking-[-0.07em] sm:text-6xl" /><RevealText className="mt-7 text-sm leading-7 text-white/60" text={`A Fórmula 1 é construída em torno da precisão. Levamos essa mesma obsessão a cada peça da coleção ${BRAND.name} — dos materiais e da construção aos detalhes que conectam tudo à pista.`} /><div className="mt-10 border-t border-white/15">{[['Precisão','Inspirada na engenharia de corrida'],['Herança','Construída em torno da cultura do automobilismo'],['Performance','Criada para viver o dia de prova']].map(([title, text]) => <div key={title} className="flex justify-between gap-6 border-b border-white/15 py-5 text-sm"><span className="font-medium">{title}</span><span className="max-w-[210px] text-right text-white/50">{text}</span></div>)}</div></div></div></section>

    {gifts.length > 0 && <section id="presentes" aria-labelledby="presentes-titulo" className="scroll-mt-20 bg-[#f5f5f3] px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><ShelfHeader id="presentes-titulo" eyebrow="Guia de presentes" title="Presentes por faixa de preço" body="Para quem vive a próxima volta: escolha pelo quanto quer gastar." href="/presentes" linkLabel="Abrir o guia de presentes" /><RevealGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4">{gifts.map((band) => <li key={band.value}><Link href={`/presentes?faixa=${band.value}`} className="group flex h-full min-h-40 flex-col justify-between rounded-2xl bg-white p-5 text-black transition-colors hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:p-6"><Gift size={22} strokeWidth={1.5} aria-hidden="true" className="text-[#b94f01] transition-colors group-hover:text-[#e8702a]" /><span><span className="block text-xl font-medium tracking-[-0.04em] sm:text-2xl">{band.label}</span><span className="mt-1 flex items-center gap-2 text-sm text-black/60 transition-colors group-hover:text-white/75">{band.count === 1 ? "1 opção" : `${band.count} opções`}<ArrowRight size={14} aria-hidden="true" className="hover-arrow" /></span></span></Link></li>)}</RevealGroup></div></section>}

    <LegendsHome items={homeLegends(allProducts)} />

    <VelocidadePortal products={velocidadeProducts} />

    <section id="journal" className="relative flex min-h-[500px] items-center justify-center overflow-hidden px-5 py-24 text-center text-white sm:px-10"><ImageReveal blur={localImage(editorial.journal.mobile.src)?.blur} className="absolute inset-0"><ArtDirectedImage alt={editorial.journal.alt} mobile={editorial.journal.mobile} desktop={editorial.journal.desktop} quality={editorialQuality} className="object-cover" /></ImageReveal><div className="absolute inset-0 bg-black/55" /><div className="relative z-10"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A corrida noturna</p><KineticText as="h2" text="Luzes apagadas." className={`hidden justify-center text-6xl tracking-[-0.08em] sm:text-8xl lg:[@media(hover:hover)]:flex font-kinetic`} /><h2 className="text-6xl font-medium tracking-[-0.08em] sm:text-8xl lg:[@media(hover:hover)]:hidden">Luzes apagadas.</h2><p className="mx-auto mt-6 max-w-md text-sm text-white/70">Viva a atmosfera da Fórmula 1 além da linha de chegada.</p><Link href="/produtos" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-xs font-medium text-black transition hover:bg-[#b94f01] hover:text-white">Comprar a coleção <ArrowUpRight size={16} /></Link><p className="mt-5"><Link href="/diario" className="group inline-flex min-h-11 items-center gap-2 text-sm text-white/85 underline-offset-4 hover:text-white hover:underline">Ler o Diário <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></Link></p></div></section>

    <section id="newsletter" className="relative scroll-mt-20 overflow-hidden bg-[#111] px-5 py-20 text-white sm:px-10 sm:py-28"><AnimatedGridPattern numSquares={30} maxOpacity={0.15} duration={3} repeatDelay={1} className="fill-white/10 stroke-white/10 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]" /><div className="relative z-10 mx-auto max-w-xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Fique no grid</p><SectionTitle text="Não perca a próxima volta." className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl" /><p className="mt-5 text-sm leading-7 text-white/55">Novos drops, peças limitadas, lançamentos de fim de semana e histórias do mundo da Fórmula 1.</p><NewsletterForm enabled={isSupabaseConfigured()} /></div></section>

    <SiteFooter />
  </main>
}
