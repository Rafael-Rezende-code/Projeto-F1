"use client";

import { useInViewOnce } from "@/components/motion/use-in-view-once";

// Nome do piloto "escrito à mão": texto real na Great Vibes (manuscrita genérica, lib/fonts.ts), revelado da esquerda
// para a direita por uma cortina na cor do fundo (`background`) com borda em degradê, que desliza para a direita (só
// transform). Parece ser escrito, sem salto no final.
// Dispara quando entra na tela, uma vez. Com prefers-reduced-motion, aparece pronto (globals.css, .sig-*).
// Folga generosa (padding em em) para laços, ascendentes e descendentes: nada é cortado.
// REGRA FIXA: efeito tipográfico genérico; NUNCA imitar o autógrafo real do piloto (ver CLAUDE.md).
export function DriverSignature({ name, background, className = "" }: { name: string; background: string; className?: string }) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>();
  return (
    <span ref={ref} aria-hidden="true" className={`sig ${className}`} data-in={inView || undefined} style={{ "--sig-bg": background } as React.CSSProperties}>
      <span className="sig-text">{name}</span>
      <span className="sig-cover" />
    </span>
  );
}
