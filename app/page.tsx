import { ArrowRight, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { CartButton } from '@/components/cart'
import { DriversSection } from '@/components/drivers-section'
import { MenuButton } from '@/components/mobile-menu'
import { NewsletterForm } from '@/components/newsletter-form'
import { ProductCard } from '@/components/product-card'
import { SiteFooter } from '@/components/site-footer'
import { Spotlight } from '@/components/spotlight'
import { TeamCard } from '@/components/team-card'
import { TeamMarquee } from '@/components/team-marquee'
import { VelocidadePortal } from '@/components/velocidade-portal'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { ArtDirectedImage } from '@/components/ui/art-directed-image'
import { KineticText } from '@/components/ui/kinetic-text'
import { editorial, editorialQuality } from '@/lib/editorial'
import { catalog } from '@/lib/catalog'
import { HOME_CAROUSEL_SLUGS, HOME_GRID_SLUGS } from '@/lib/catalog/seed/products'
import { teams } from '@/lib/teams'

const BASE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png'
const REVEAL_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_24-BobebdPiCa5YmPt5HBNd0l081R6lej.png'
// next/image dos cards de produto e categoria: qualidade 85 e sizes = largura real do card em cada breakpoint
// (página com padding de 20px (<640) ou 40px, conteúdo de no máx. 1400px).
const CARD_QUALITY = 85
// Carrossel "O que o grid veste": min-w 72vw / 320px / 360px.
// O carrossel sangra até as bordas da janela (o corte do último card acontece na borda da tela, não no container).
// O primeiro card continua alinhado ao título: padding e scroll-padding = margem do container de 1400px.
// Padding: % = largura do conteúdo da seção (janela − padding); scroll-padding: % = largura do próprio carrossel (janela).
const CAROUSEL_BLEED = "px-[calc(1.25rem+max(0px,(100%-1400px)/2))] scroll-px-[max(1.25rem,(100%-1400px)/2)] sm:px-[calc(2.5rem+max(0px,(100%-1400px)/2))] sm:scroll-px-[max(2.5rem,(100%-1400px)/2)]"
const CAROUSEL_PRODUCT_SIZES = '(min-width: 1024px) 360px, (min-width: 640px) 320px, 72vw'
// Categorias: 1 coluna (<640), 2 (<1024), 4 a partir de lg, gap 12px.
const CATEGORY_SIZES = '(min-width: 1480px) 341px, (min-width: 1024px) calc((100vw - 116px) / 4), (min-width: 640px) calc((100vw - 92px) / 2), calc(100vw - 40px)'
function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">{eyebrow}</p><h2 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl md:text-6xl">{title}</h2><p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-black/55 sm:text-base">{body}</p></div>
}

function CategoryCard({ slug, title, subtitle, image, number }: { slug: string; title: string; subtitle: string; image: string; number: string }) {
  return <Link href={`/categorias/${slug}`} className="group relative aspect-[0.82] overflow-hidden rounded-2xl bg-black"><Image src={image} alt="" fill sizes={CATEGORY_SIZES} quality={CARD_QUALITY} className="object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10 transition group-hover:from-black/85" /><div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-white"><div><p className="mb-3 text-[10px] tracking-[0.2em] text-white/55">{number}</p><h3 className="text-2xl font-medium tracking-[-0.05em]">{title}</h3><p className="mt-1 text-sm text-white/65">{subtitle}</p></div><ArrowUpRight className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></div></Link>
}

export default async function Page() {
  const [categories, gridProducts, carouselProducts] = await Promise.all([catalog.getCategories(), catalog.getProductsBySlugs(HOME_GRID_SLUGS), catalog.getProductsBySlugs(HOME_CAROUSEL_SLUGS)])
  const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name
  return <main id="top" className="min-h-screen bg-white">
    <section className="relative h-screen w-full overflow-hidden bg-black" style={{ height: '100dvh' }}>
      <div className="absolute inset-0 z-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${BASE_IMAGE})` }} /><Spotlight image={REVEAL_IMAGE} /><div className="absolute inset-0 z-20 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-5 text-white sm:px-10 sm:py-7 md:px-14"><a href="#top" className="font-playfair text-3xl italic tracking-[-0.07em]" aria-label="Apex início">Apex<span className="text-[#e8702a]">.</span></a><nav className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.18em] md:flex" aria-label="Navegação principal"><Link href="/produtos" className="transition-opacity hover:opacity-60">Coleção</Link><a href="#story" className="transition-opacity hover:opacity-60">Manifesto</a><a href="#journal" className="transition-opacity hover:opacity-60">Diário</a></nav><div className="flex items-center gap-4"><CartButton /><MenuButton className="md:hidden" /></div></header>
      <div className="pointer-events-none absolute left-0 right-0 top-[14%] z-50 flex flex-col items-center px-5 text-center text-white"><h1 className="leading-[0.95]" style={{ fontSize: '14px' }}><span className="font-playfair block text-5xl font-normal italic sm:text-7xl md:text-8xl" style={{ letterSpacing: '-0.05em' }}>Feita para</span><span className="mt-[-0.08em] block text-5xl font-normal italic sm:text-7xl md:text-8xl" style={{ letterSpacing: '-0.08em' }}>pilotos</span></h1></div>
      <p className="absolute bottom-14 left-10 z-50 hidden max-w-[260px] text-sm leading-relaxed text-white/80 md:left-14 sm:block">Cada milissegundo é projetado. Das superfícies aerodinâmicas às unidades de potência construídas com precisão, a Fórmula 1 é onde tecnologia, velocidade e habilidade humana encontram o limite.</p><div className="absolute bottom-10 left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:left-auto sm:right-10 sm:max-w-[260px] sm:gap-5 md:right-14"><p className="text-xs leading-relaxed text-white/80 sm:text-sm">Explore camisetas premium de Fórmula 1, memorabilia das pistas, colecionáveis e peças inspiradas nas máquinas e equipes que definem o automobilismo.</p><a href="#collection" className="group inline-flex items-center gap-3 rounded-xl bg-[#b94f01] px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:bg-[#9f4300] active:scale-95">Ver coleção <ArrowUpRight /></a></div><div className="absolute bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 lg:flex"><span className="h-px w-8 bg-white/50" /> Pilotos <span className="h-px w-8 bg-white/50" /></div>
    </section>

    <DriversSection />

    <TeamMarquee />

    <section id="collection" className="px-5 pb-20 pt-16 sm:px-10 sm:pb-28 sm:pt-20"><SectionIntro eyebrow="Explore a coleção" title="Feita em torno da corrida." body="Dos essenciais do dia de prova às peças colecionáveis, descubra produtos de Fórmula 1 para quem vive pela próxima volta." /><div className="mx-auto mt-14 grid max-w-[1400px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map((category, index) => <CategoryCard key={category.slug} slug={category.slug} number={String(index + 1).padStart(2, "0")} title={category.name} subtitle={category.description} image={category.image} />)}</div></section>

    <section className="bg-[#f5f5f3] px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><div className="mb-12 flex items-end justify-between gap-6"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">A coleção</p><h2 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">Essenciais do dia de prova</h2></div><Link href="/produtos" className="hidden items-center gap-2 text-sm text-black/60 transition hover:text-black sm:flex">Ver todos os produtos <ArrowRight size={16} /></Link></div><div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5">{gridProducts.map((product) => <ProductCard key={product.id} product={product} categoryName={categoryName(product.categorySlug)} />)}</div></div></section>

    <section id="story" className="relative flex min-h-[650px] items-center overflow-hidden bg-[#090909] px-5 py-24 text-white sm:px-10"><ArtDirectedImage alt={editorial.story.alt} mobile={editorial.story.mobile} desktop={editorial.story.desktop} quality={editorialQuality} className="object-cover opacity-65" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" /><div className="relative z-10 mx-auto w-full max-w-[1400px]"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A cultura da velocidade</p><h2 className="max-w-3xl text-5xl font-medium leading-[0.92] tracking-[-0.07em] sm:text-6xl md:text-8xl">Mais que uma corrida.<br /><span className="font-playfair italic">Um jeito de viver.</span></h2><p className="mt-8 max-w-md text-sm leading-7 text-white/65">As máquinas, as equipes, os circuitos e os momentos que transformam cada fim de semana de corrida em algo inesquecível.</p><a href="#journal" className="mt-9 inline-flex items-center gap-3 rounded-xl border border-white/40 px-5 py-3 text-xs font-medium transition hover:border-white hover:bg-white hover:text-black">Explore o mundo da F1 <ArrowUpRight size={16} /></a></div></section>

    <section id="teams" className="px-5 py-20 sm:px-10 sm:py-28"><SectionIntro eyebrow="Escolha sua equipe" title="Com quem você corre?" body="Roupas e colecionáveis inspirados nas equipes que definem o grid." />{/* 11 equipes: 4 + 4 + 3 centralizado (desktop/tablet); 2 por linha no celular, a última centralizada. */}<ul role="list" className="mx-auto mt-14 flex max-w-[1200px] flex-wrap justify-center gap-3">{teams.map((team) => <li key={team.slug} className="w-[calc(50%-6px)] sm:w-[calc(25%-9px)]"><TeamCard team={team} /></li>)}</ul></section>

    <section className="grid min-h-[620px] grid-cols-1 bg-[#111] text-white lg:grid-cols-2"><div className="relative min-h-[380px]"><Image src={editorial.detail.mobile.src} alt={editorial.detail.alt} fill sizes={editorial.detail.mobile.sizes} quality={editorialQuality} className="object-cover" style={{ objectPosition: editorial.detail.mobile.position }} /></div><div className="flex items-center px-6 py-20 sm:px-14 lg:px-20"><div className="max-w-lg"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Obsessão projetada</p><h2 className="text-5xl font-medium tracking-[-0.07em] sm:text-6xl">Cada detalhe importa.</h2><p className="mt-7 text-sm leading-7 text-white/60">A Fórmula 1 é construída em torno da precisão. Levamos essa mesma obsessão a cada peça da coleção Apex — dos materiais e da construção aos detalhes que conectam tudo à pista.</p><div className="mt-10 border-t border-white/15">{[['Precisão','Inspirada na engenharia de corrida'],['Herança','Construída em torno da cultura do automobilismo'],['Performance','Criada para viver o dia de prova']].map(([title, text]) => <div key={title} className="flex justify-between gap-6 border-b border-white/15 py-5 text-sm"><span className="font-medium">{title}</span><span className="max-w-[210px] text-right text-white/50">{text}</span></div>)}</div></div></div></section>

    <section id="bestsellers" className="bg-[#f5f5f3] px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Mais desejados</p><div className="flex items-end justify-between gap-5"><div><h2 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">O que o grid veste</h2><p className="mt-4 text-sm text-black/55">As peças às quais nossa comunidade sempre retorna.</p></div><div className="hidden gap-2 sm:flex"><button aria-label="Voltar produtos" className="rounded-xl border border-black/15 p-3 text-black"><ArrowRight className="rotate-180" size={16} /></button><button aria-label="Avançar produtos" className="rounded-xl border border-black/15 p-3 text-black"><ArrowRight size={16} /></button></div></div></div><div className={`-mx-5 mt-12 flex snap-x gap-4 overflow-x-auto pb-4 [scrollbar-width:none] sm:-mx-10 ${CAROUSEL_BLEED}`}>{carouselProducts.map((product) => <div key={product.id} className="min-w-[72vw] snap-start sm:min-w-[320px] lg:min-w-[360px]"><ProductCard product={product} categoryName={categoryName(product.categorySlug)} sizes={CAROUSEL_PRODUCT_SIZES} /></div>)}</div></section>

    <VelocidadePortal />

    <section id="journal" className="relative flex min-h-[500px] items-center justify-center overflow-hidden px-5 py-24 text-center text-white sm:px-10"><ArtDirectedImage alt={editorial.journal.alt} mobile={editorial.journal.mobile} desktop={editorial.journal.desktop} quality={editorialQuality} className="object-cover" /><div className="absolute inset-0 bg-black/55" /><div className="relative z-10"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A corrida noturna</p><KineticText as="h2" text="Luzes apagadas." className={`hidden justify-center text-6xl tracking-[-0.08em] sm:text-8xl lg:[@media(hover:hover)]:flex font-kinetic`} /><h2 className="text-6xl font-medium tracking-[-0.08em] sm:text-8xl lg:[@media(hover:hover)]:hidden">Luzes apagadas.</h2><p className="mx-auto mt-6 max-w-md text-sm text-white/70">Viva a atmosfera da Fórmula 1 além da linha de chegada.</p><Link href="/produtos" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-xs font-medium text-black transition hover:bg-[#b94f01] hover:text-white">Comprar a coleção <ArrowUpRight size={16} /></Link></div></section>

    <section className="relative overflow-hidden bg-[#111] px-5 py-20 text-white sm:px-10 sm:py-28"><AnimatedGridPattern numSquares={30} maxOpacity={0.15} duration={3} repeatDelay={1} className="fill-white/10 stroke-white/10 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]" /><div className="relative z-10 mx-auto max-w-xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Fique no grid</p><h2 className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Não perca a próxima volta.</h2><p className="mt-5 text-sm leading-7 text-white/55">Novos drops, peças limitadas, lançamentos de fim de semana e histórias do mundo da Fórmula 1.</p><NewsletterForm /></div></section>

    <SiteFooter />
  </main>
}
