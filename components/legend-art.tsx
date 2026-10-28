import Image from "next/image";
import type { ReactNode } from "react";
import type { Legend } from "@/lib/content/legends";

// Fundo das lendas (loja extra, item 7). Sem fotos de terceiros: Senna usa a foto que o projeto já tem; os outros, um
// fundo gráfico em código (degradê no tom da lenda + as linhas de fluxo da VELOCIDADE, à deriva lenta em transform). As linhas são um SVG estático
// (public/images/lendas/linhas.svg, gerado de lib/velocidade-pattern.ts): no HTML eram ~40 KB por card.
export function LegendArt({ legend, className = "", sizes = "100vw", priority = false, children }: { legend: Legend; className?: string; sizes?: string; priority?: boolean; children?: ReactNode }) {
  return (
    <div className={`relative isolate overflow-hidden bg-[#0b0b0b] text-white ${className}`}>
      {legend.photo ? (
        <>
          <Image src={legend.photo.src} alt="" fill sizes={sizes} priority={priority} quality={75} className="object-cover opacity-70" style={{ objectPosition: legend.photo.position }} />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${legend.color} 0%, transparent 60%), linear-gradient(160deg, ${legend.color}55 0%, #0b0b0b 70%)` }} />
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG decorativo estático (scripts/images/linhas-lendas.mts), sem otimização a fazer */}
          <img src="/images/lendas/linhas.svg" alt="" aria-hidden="true" className="legend-pattern" decoding="async" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </>
      )}
      <div className="relative w-full">{children}</div>
    </div>
  );
}
