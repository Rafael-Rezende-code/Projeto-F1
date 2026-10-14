'use client'

import { useEffect, useRef } from 'react'

const SPOTLIGHT_R = 260

// Máscara CSS com os mesmos stops do gradiente que antes era desenhado num canvas e exportado como PNG a cada frame.
const SPOTLIGHT_MASK = `radial-gradient(circle ${SPOTLIGHT_R}px at var(--spot-x) var(--spot-y), rgba(255,255,255,1) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.75) 60%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.12) 88%, rgba(255,255,255,0) 100%)`

// Camada de "raio-x" do hero. O loop escreve --spot-x/--spot-y e a máscara direto na div (ref, sem setState).
// O loop só roda com o hero (o elemento pai desta camada) na tela. Antes do primeiro movimento do mouse a camada
// fica sem máscara (comportamento original do v0).
export function Spotlight({ image }: { image: string }) {
  const layerRef = useRef<HTMLDivElement>(null)
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
  return <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${image})`, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }} />
}
