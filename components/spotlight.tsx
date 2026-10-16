'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { HERO_QUALITY, HERO_SIZES } from '@/lib/hero'

const SPOTLIGHT_R = 260

// Máscara CSS com os mesmos stops do gradiente que antes era desenhado num canvas e exportado como PNG a cada frame.
const SPOTLIGHT_MASK = `radial-gradient(circle ${SPOTLIGHT_R}px at var(--spot-x) var(--spot-y), rgba(255,255,255,1) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.75) 60%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.12) 88%, rgba(255,255,255,0) 100%)`

// Camada de "raio-x" do hero. O loop escreve --spot-x/--spot-y e a máscara direto na div (ref, sem setState).
// O loop só roda com o hero (o elemento pai desta camada) na tela. Antes do primeiro movimento do mouse a camada
// fica sem máscara (comportamento original do v0): por isso esta é a foto que aparece no carregamento (vem no
// HTML, carga imediata, sem preload: o LCP da home é o parágrafo do hero).
// A imagem é um next/image (AVIF/WebP no tamanho da tela; era um PNG de 2,4 MB) com o mesmo enquadramento do antigo
// bg-cover/bg-center (object-cover); a máscara fica na div.
// `base` (a foto de baixo) só aparece quando a máscara entra (mouse ou toque): ela é montada no ocioso depois do load,
// ou no primeiro movimento, o que vier antes. Assim não disputa banda com o CSS, as fontes e a foto visível no
// carregamento (era o que mais pesava no Lighthouse do celular). Visual igual: antes do primeiro movimento ela fica
// inteira por baixo desta camada.
export function Spotlight({ image, base }: { image: string; base: string }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [baseReady, setBaseReady] = useState(false)
  // Fonte do hero (ver HERO_FONT_SCRIPT em lib/hero.ts): o script inline não roda em navegação interna (SPA).
  useEffect(() => {
    // Na carga inicial o script inline cuida disso (depois do primeiro quadro com conteúdo); aqui só em navegação interna.
    if (!(window as Window & { __heroFont?: number }).__heroFont) document.documentElement.style.setProperty('--hero-font', 'var(--font-hero)')
  }, [])
  useEffect(() => {
    let done = false
    const show = () => { if (!done) { done = true; setBaseReady(true) } }
    const idle = () => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(show, { timeout: 2000 }) : setTimeout(show, 1200))
    if (document.readyState === 'complete') idle()
    else window.addEventListener('load', idle, { once: true })
    window.addEventListener('mousemove', show, { once: true })
    return () => { window.removeEventListener('load', idle); window.removeEventListener('mousemove', show) }
  }, [])
  useEffect(() => {
    const layer = layerRef.current
    const hero = layer?.parentElement
    if (!layer || !hero) return
    const mouse = { x: -999, y: -999 }
    const smooth = { x: -999, y: -999 }
    let raf: number | null = null
    const handleMouseMove = (event: MouseEvent) => { mouse.x = event.clientX; mouse.y = event.clientY }
    const animate = () => {
      smooth.x += (mouse.x - smooth.x) * 0.1
      smooth.y += (mouse.y - smooth.y) * 0.1
      if (smooth.x >= 0 && smooth.y >= 0) {
        layer.style.setProperty('--spot-x', `${smooth.x}px`)
        layer.style.setProperty('--spot-y', `${smooth.y}px`)
        if (!layer.style.maskImage) { layer.style.maskImage = SPOTLIGHT_MASK; layer.style.webkitMaskImage = SPOTLIGHT_MASK }
      }
      raf = requestAnimationFrame(animate)
    }
    const start = () => { if (raf === null) raf = requestAnimationFrame(animate) }
    const stop = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null } }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
    observer.observe(hero)
    window.addEventListener('mousemove', handleMouseMove)
    return () => { window.removeEventListener('mousemove', handleMouseMove); observer.disconnect(); stop() }
  }, [])
  return (
    <>
    {baseReady && (
      <div className="absolute inset-0 z-10">
        <Image src={base} alt="" fill loading="eager" fetchPriority="low" sizes={HERO_SIZES} quality={HERO_QUALITY} className="object-cover" />
      </div>
    )}
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30" style={{ maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}>
      <Image src={image} alt="" fill loading="eager" sizes={HERO_SIZES} quality={HERO_QUALITY} className="object-cover" />
    </div>
    </>
  )
}
