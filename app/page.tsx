'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, CirclePlay, Globe, Heart, Menu, ShoppingBag } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { DriversSection } from '@/components/drivers-section'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { LogoItem, LogoMarquee } from '@/components/ui/logo-marquee'
import { f1Teams } from '@/lib/f1-teams'

const BASE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_19-UziT4mNovMUn0LdmYLaeGddHhCK2VB.png'
const REVEAL_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2028%20de%20set.%20de%202026%2C%2015_42_24-BobebdPiCa5YmPt5HBNd0l081R6lej.png'
const SPOTLIGHT_R = 260
const photography = {
  teamwear: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=85',
  racing: BASE_IMAGE,
  collectibles: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=85',
  accessories: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85',
  speed: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1800&q=85',
  cockpit: REVEAL_IMAGE,
  night: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1800&q=85',
}
const products = [
  { name: 'Scuderia Racing Jacket', price: 'R$ 649,90', category: 'Teamwear', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', badge: 'NOVO' },
  { name: 'Ferrari Team Cap', price: 'R$ 189,90', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85' },
  { name: 'Monaco Racing Tee', price: 'R$ 229,90', category: 'Racing', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85' },
  { name: 'Classic Racing Hoodie', price: 'R$ 399,90', category: 'Teamwear', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85' },
  { name: 'Pit Lane Overshirt', price: 'R$ 459,90', category: 'Racing', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85' },
  { name: 'Apex Circuit Tote', price: 'R$ 169,90', category: 'Acessórios', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85' },
]

// Máscara CSS com os mesmos stops do gradiente que antes era desenhado num canvas e exportado como PNG a cada frame.
const SPOTLIGHT_MASK = `radial-gradient(circle ${SPOTLIGHT_R}px at var(--spot-x) var(--spot-y), rgba(255,255,255,1) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.75) 60%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.12) 88%, rgba(255,255,255,0) 100%)`

function RevealLayer({ image, cursorX, cursorY }: { image: string; cursorX: number; cursorY: number }) {
  const revealRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const reveal = revealRef.current
    if (!reveal || cursorX < 0 || cursorY < 0) return
    reveal.style.setProperty('--spot-x', `${cursorX}px`); reveal.style.setProperty('--spot-y', `${cursorY}px`)
    if (!reveal.style.maskImage) { reveal.style.maskImage = SPOTLIGHT_MASK; reveal.style.webkitMaskImage = SPOTLIGHT_MASK }
  }, [cursorX, cursorY])
  return <div ref={revealRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${image})`, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }} />
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">{eyebrow}</p><h2 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl md:text-6xl">{title}</h2><p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-black/55 sm:text-base">{body}</p></div>
}

function ProductCard({ product, onAdd }: { product: typeof products[number]; onAdd: (name: string) => void }) {
  return <article className="group"><div className="relative aspect-[4/5] overflow-hidden bg-[#e9e8e4]"><img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute left-3 top-3 flex gap-2">{product.badge && <span className="bg-[#e8702a] px-2 py-1 text-[9px] font-semibold tracking-[0.16em] text-white">{product.badge}</span>}</div><button aria-label={`Adicionar ${product.name} aos favoritos`} className="absolute right-3 top-3 rounded-full bg-white/85 p-2 text-black opacity-0 transition group-hover:opacity-100"><Heart size={16} strokeWidth={1.5} /></button><button onClick={() => onAdd(product.name)} className="absolute bottom-3 left-3 right-3 translate-y-3 bg-black px-4 py-3 text-xs font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">Adicionar à sacola</button></div><p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-black/45">{product.category}</p><div className="mt-1 flex items-start justify-between gap-3"><h3 className="text-sm font-medium text-black sm:text-base">{product.name}</h3><p className="whitespace-nowrap text-sm text-black/65">{product.price}</p></div></article>
}

function CategoryCard({ title, subtitle, image, number }: { title: string; subtitle: string; image: string; number: string }) {
  return <a href="#collection" className="group relative aspect-[0.82] overflow-hidden rounded-2xl bg-black"><img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10 transition group-hover:from-black/85" /><div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-white"><div><p className="mb-3 text-[10px] tracking-[0.2em] text-white/55">{number}</p><h3 className="text-2xl font-medium tracking-[-0.05em]">{title}</h3><p className="mt-1 text-sm text-white/65">{subtitle}</p></div><ArrowUpRight className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></div></a>
}

function TeamMarquee() {
  const prefersReducedMotion = useReducedMotion()
  // No servidor useReducedMotion é null; no cliente já lê a preferência no 1º render.
  // Renderiza o marquee até montar para o HTML do servidor e a hidratação baterem.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section aria-label="Equipes do grid" className="overflow-hidden border-y border-black/10 bg-white py-8 md:py-10">
      {mounted && prefersReducedMotion ? (
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-5">
          {f1Teams.map((team) => <LogoItem key={team.alt} logo={team} />)}
        </div>
      ) : (
        <LogoMarquee logos={f1Teams} />
      )}
    </section>
  )
}

export default function Page() {
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 }); const mouse = useRef({ x: -999, y: -999 }); const smooth = useRef({ x: -999, y: -999 }); const rafRef = useRef<number | null>(null); const heroRef = useRef<HTMLElement>(null)
  const [cartCount, setCartCount] = useState(0); const [notice, setNotice] = useState('')
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => { mouse.current = { x: event.clientX, y: event.clientY } }; const animate = () => { smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1; smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1; setCursorPos({ ...smooth.current }); rafRef.current = requestAnimationFrame(animate) }
    // O spotlight só roda com o hero na tela: fora dele, o loop (e o re-render por frame) para.
    const start = () => { if (rafRef.current === null) rafRef.current = requestAnimationFrame(animate) }; const stop = () => { if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())); if (heroRef.current) observer.observe(heroRef.current)
    window.addEventListener('mousemove', handleMouseMove); return () => { window.removeEventListener('mousemove', handleMouseMove); observer.disconnect(); stop() }
  }, [])
  const addToCart = (name: string) => { setCartCount((count) => count + 1); setNotice(`${name} foi adicionado à sacola`); window.setTimeout(() => setNotice(''), 2400) }
  return <main id="top" className="min-h-screen bg-white tracking-[-0.02em]" style={{ fontFamily: "'Inter', sans-serif" }}>
    <section ref={heroRef} className="relative h-screen w-full overflow-hidden bg-black" style={{ height: '100dvh' }}>
      <div className="absolute inset-0 z-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${BASE_IMAGE})` }} /><RevealLayer image={REVEAL_IMAGE} cursorX={cursorPos.x} cursorY={cursorPos.y} /><div className="absolute inset-0 z-20 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-5 text-white sm:px-10 sm:py-7 md:px-14"><a href="#top" className="font-playfair text-3xl italic tracking-[-0.07em]" aria-label="Apex início">Apex<span className="text-[#e8702a]">.</span></a><nav className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.18em] md:flex" aria-label="Navegação principal"><a href="#collection" className="transition-opacity hover:opacity-60">Coleção</a><a href="#story" className="transition-opacity hover:opacity-60">Manifesto</a><a href="#journal" className="transition-opacity hover:opacity-60">Diário</a></nav><div className="flex items-center gap-4"><button aria-label="Sacola de compras" className="relative transition-opacity hover:opacity-60"><ShoppingBag strokeWidth={1.5} />{cartCount > 0 && <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[#e8702a] text-[9px]">{cartCount}</span>}</button><button aria-label="Abrir menu" className="md:hidden"><Menu strokeWidth={1.5} /></button></div></header>
      <div className="pointer-events-none absolute left-0 right-0 top-[14%] z-50 flex flex-col items-center px-5 text-center text-white"><h1 className="leading-[0.95]" style={{ fontSize: '14px' }}><span className="font-playfair block text-5xl font-normal italic sm:text-7xl md:text-8xl" style={{ letterSpacing: '-0.05em' }}>Feita para</span><span className="mt-[-0.08em] block text-5xl font-normal italic sm:text-7xl md:text-8xl" style={{ letterSpacing: '-0.08em' }}>pilotos</span></h1></div>
      <p className="absolute bottom-14 left-10 z-50 hidden max-w-[260px] text-sm leading-relaxed text-white/80 md:left-14 sm:block">Cada milissegundo é projetado. Das superfícies aerodinâmicas às unidades de potência construídas com precisão, a Fórmula 1 é onde tecnologia, velocidade e habilidade humana encontram o limite.</p><div className="absolute bottom-10 left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:left-auto sm:right-10 sm:max-w-[260px] sm:gap-5 md:right-14"><p className="text-xs leading-relaxed text-white/80 sm:text-sm">Explore camisetas premium de Fórmula 1, memorabilia das pistas, colecionáveis e peças inspiradas nas máquinas e equipes que definem o automobilismo.</p><a href="#collection" className="group inline-flex items-center gap-3 rounded-full bg-[#e8702a] px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:bg-[#d2611f] active:scale-95">Ver coleção <ArrowUpRight /></a></div><div className="absolute bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 lg:flex"><span className="h-px w-8 bg-white/50" /> Pilotos <span className="h-px w-8 bg-white/50" /></div>
    </section>

    <DriversSection />

    <TeamMarquee />

    <section id="collection" className="px-5 py-20 sm:px-10 sm:py-28"><SectionIntro eyebrow="Explore a coleção" title="Feita em torno da corrida." body="Dos essenciais do dia de prova às peças colecionáveis, descubra produtos de Fórmula 1 para quem vive pela próxima volta." /><div className="mx-auto mt-14 grid max-w-[1400px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><CategoryCard number="01" title="Teamwear" subtitle="Represente sua equipe." image={photography.teamwear} /><CategoryCard number="02" title="Racing" subtitle="Feito para a velocidade." image={photography.racing} /><CategoryCard number="03" title="Colecionáveis" subtitle="Guarde a memória." image={photography.collectibles} /><CategoryCard number="04" title="Acessórios" subtitle="Leve o grid com você." image={photography.accessories} /></div></section>

    <section className="bg-[#f5f5f3] px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><div className="mb-12 flex items-end justify-between gap-6"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A coleção</p><h2 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">Essenciais do dia de prova</h2></div><a href="#bestsellers" className="hidden items-center gap-2 text-sm text-black/60 transition hover:text-black sm:flex">Ver todos os produtos <ArrowRight size={16} /></a></div><div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-5"><ProductCard product={products[0]} onAdd={addToCart} /><ProductCard product={products[1]} onAdd={addToCart} /><ProductCard product={products[2]} onAdd={addToCart} /><ProductCard product={products[3]} onAdd={addToCart} /></div></div></section>

    <section id="story" className="relative flex min-h-[650px] items-center overflow-hidden bg-[#090909] px-5 py-24 text-white sm:px-10"><img src={photography.speed} alt="Carro de Fórmula 1 em alta velocidade no circuito" className="absolute inset-0 h-full w-full object-cover opacity-65" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" /><div className="relative z-10 mx-auto w-full max-w-[1400px]"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A cultura da velocidade</p><h2 className="max-w-3xl text-5xl font-medium leading-[0.92] tracking-[-0.07em] sm:text-6xl md:text-8xl">Mais que uma corrida.<br /><span className="font-playfair italic">Um jeito de viver.</span></h2><p className="mt-8 max-w-md text-sm leading-7 text-white/65">As máquinas, as equipes, os circuitos e os momentos que transformam cada fim de semana de corrida em algo inesquecível.</p><a href="#journal" className="mt-9 inline-flex items-center gap-3 border border-white/40 px-5 py-3 text-xs font-medium transition hover:border-white hover:bg-white hover:text-black">Explore o mundo da F1 <ArrowUpRight size={16} /></a></div></section>

    <section id="teams" className="px-5 py-20 sm:px-10 sm:py-28"><SectionIntro eyebrow="Escolha sua equipe" title="Com quem você corre?" body="Roupas e colecionáveis inspirados nas equipes que definem o grid." /><div className="mx-auto mt-14 grid max-w-[1200px] grid-cols-2 gap-px border border-black/10 bg-black/10 sm:grid-cols-4">{['Ferrari','Mercedes','McLaren','Red Bull Racing','Aston Martin','Alpine','Williams','Haas'].map((team) => <a href="#collection" key={team} className="group flex aspect-[1.4] items-end bg-[#f5f5f3] p-5 text-black transition hover:bg-black hover:text-white sm:p-7"><span className="text-lg font-medium tracking-[-0.04em] transition group-hover:translate-x-1 sm:text-xl">{team}</span></a>)}</div></section>

    <section className="grid min-h-[620px] grid-cols-1 bg-[#111] text-white lg:grid-cols-2"><div className="min-h-[380px] bg-cover bg-center" style={{ backgroundImage: `url(${photography.cockpit})` }} role="img" aria-label="Detalhes técnicos de um carro de Fórmula 1" /><div className="flex items-center px-6 py-20 sm:px-14 lg:px-20"><div className="max-w-lg"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Obsessão projetada</p><h2 className="text-5xl font-medium tracking-[-0.07em] sm:text-6xl">Cada detalhe importa.</h2><p className="mt-7 text-sm leading-7 text-white/60">A Fórmula 1 é construída em torno da precisão. Levamos essa mesma obsessão a cada peça da coleção Apex — dos materiais e da construção aos detalhes que conectam tudo à pista.</p><div className="mt-10 border-t border-white/15">{[['Precisão','Inspirada na engenharia de corrida'],['Herança','Construída em torno da cultura do automobilismo'],['Performance','Criada para viver o dia de prova']].map(([title, text]) => <div key={title} className="flex justify-between gap-6 border-b border-white/15 py-5 text-sm"><span className="font-medium">{title}</span><span className="max-w-[210px] text-right text-white/45">{text}</span></div>)}</div></div></div></section>

    <section id="bestsellers" className="bg-[#f5f5f3] px-5 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1400px]"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Mais desejados</p><div className="flex items-end justify-between gap-5"><div><h2 className="text-4xl font-medium tracking-[-0.06em] text-black sm:text-5xl">O que o grid veste</h2><p className="mt-4 text-sm text-black/55">As peças às quais nossa comunidade sempre retorna.</p></div><div className="hidden gap-2 sm:flex"><button aria-label="Voltar produtos" className="rounded-full border border-black/15 p-3 text-black"><ArrowRight className="rotate-180" size={16} /></button><button aria-label="Avançar produtos" className="rounded-full border border-black/15 p-3 text-black"><ArrowRight size={16} /></button></div></div><div className="mt-12 flex snap-x gap-4 overflow-x-auto pb-4 [scrollbar-width:none]">{products.slice(1).map((product) => <div key={product.name} className="min-w-[72vw] snap-start sm:min-w-[320px] lg:min-w-[360px]"><ProductCard product={product} onAdd={addToCart} /></div>)}</div></div></section>

    <section id="journal" className="relative flex min-h-[500px] items-center justify-center overflow-hidden px-5 py-24 text-center text-white sm:px-10"><img src={photography.night} alt="Circuito de Fórmula 1 iluminado à noite" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-black/55" /><div className="relative z-10"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">A corrida noturna</p><h2 className="text-6xl font-medium tracking-[-0.08em] sm:text-8xl">Luzes apagadas.</h2><p className="mx-auto mt-6 max-w-md text-sm text-white/70">Viva a atmosfera da Fórmula 1 além da linha de chegada.</p><a href="#collection" className="mt-8 inline-flex items-center gap-3 bg-white px-6 py-3 text-xs font-medium text-black transition hover:bg-[#e8702a] hover:text-white">Comprar a coleção <ArrowUpRight size={16} /></a></div></section>

    <section className="relative overflow-hidden bg-[#111] px-5 py-20 text-white sm:px-10 sm:py-28"><AnimatedGridPattern numSquares={30} maxOpacity={0.15} duration={3} repeatDelay={1} className="fill-white/10 stroke-white/10 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]" /><div className="relative z-10 mx-auto max-w-xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8702a]">Fique no grid</p><h2 className="text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Não perca a próxima volta.</h2><p className="mt-5 text-sm leading-7 text-white/55">Novos drops, peças limitadas, lançamentos de fim de semana e histórias do mundo da Fórmula 1.</p><form className="mx-auto mt-8 flex max-w-md border-b border-white/25 pb-3" onSubmit={(event) => event.preventDefault()}><input aria-label="Seu endereço de e-mail" type="email" required placeholder="Seu endereço de e-mail" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" /><button className="text-xs font-semibold uppercase tracking-[0.15em] text-[#e8702a]">Assinar</button></form></div></section>

    <footer className="bg-[#080808] px-5 py-16 text-white sm:px-10 sm:py-20"><div className="mx-auto grid max-w-[1400px] gap-12 sm:grid-cols-2 lg:grid-cols-4"><div><a href="#top" className="font-playfair text-4xl italic tracking-[-0.08em]">Apex<span className="text-[#e8702a]">.</span></a><p className="mt-5 max-w-[210px] text-sm leading-6 text-white/45">Cultura, roupas e colecionáveis premium de Fórmula 1.</p></div>{[['Comprar',['Teamwear','Racing','Colecionáveis','Acessórios','Novidades']],['Explorar',['Equipes','Pilotos','Circuitos','Cultura F1','Sobre a Apex']],['Ajuda',['Contato','Envio','Trocas','Guia de tamanhos','FAQ']]].map(([heading, links]) => <div key={heading as string}><h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{heading}</h3><div className="flex flex-col gap-3 text-sm text-white/70">{(links as string[]).map((link) => <a href={link === 'Pilotos' ? '#pilotos' : '#collection'} key={link} className="transition hover:text-white">{link}</a>)}</div></div>)}</div><div className="mx-auto mt-16 flex max-w-[1400px] flex-col justify-between gap-5 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.12em] text-white/35 sm:flex-row"><span>© 2026 Apex. Todos os direitos reservados.</span><div className="flex gap-5"><a href="#top" aria-label="Instagram"><Globe size={15} /></a><a href="#top" aria-label="TikTok"><CirclePlay size={15} /></a><a href="#top" aria-label="YouTube"><CirclePlay size={15} /></a></div></div></footer>
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 bg-black px-5 py-3 text-xs text-white shadow-xl">{notice}</div>}
  </main>
}
