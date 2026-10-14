import { LogoMarquee } from '@/components/ui/logo-marquee'
import { f1Teams } from '@/lib/f1-teams'

// A faixa anima sempre, inclusive com prefers-reduced-motion (decisão de produto, ver CLAUDE.md).
export function TeamMarquee() {
  return (
    <section aria-label="Equipes do grid" className="overflow-hidden border-y border-black/10 bg-white py-8 md:py-10">
      <LogoMarquee logos={f1Teams} />
    </section>
  )
}
