import Image from "next/image";
import type { ReactNode } from "react";
import { PATTERN_BOX, PATTERN_PATHS } from "@/lib/velocidade-pattern";
import type { Legend } from "@/lib/content/legends";

// Fundo das lendas (loja extra, item 7). Sem fotos de terceiros: Senna usa a foto que o projeto já tem; os outros, um
// fundo gráfico em código (degradê no tom da lenda + as linhas de fluxo da VELOCIDADE, à deriva lenta em transform).
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
          <svg aria-hidden="true" className="legend-pattern" viewBox={`${PATTERN_BOX.x} ${PATTERN_BOX.y} ${PATTERN_BOX.width} ${PATTERN_BOX.height}`} preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="#fff" strokeWidth={1}>
              {PATTERN_PATHS.map((d, index) => (
                <path key={index} d={d} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </svg>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </>
      )}
      <div className="relative w-full">{children}</div>
    </div>
  );
}
