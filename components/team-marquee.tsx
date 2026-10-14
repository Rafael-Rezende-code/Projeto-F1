'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { LogoItem, LogoMarquee } from '@/components/ui/logo-marquee'
import { f1Teams } from '@/lib/f1-teams'

export function TeamMarquee() {
  const prefersReducedMotion = useReducedMotion()
  // No servidor useReducedMotion é null; no cliente já lê a preferência no 1º render.
  // Renderiza o marquee até montar para o HTML do servidor e a hidratação baterem.
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intencional: o render extra após montar é o que evita o hydration mismatch
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
