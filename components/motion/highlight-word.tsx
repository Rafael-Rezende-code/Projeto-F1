"use client";

import { useInViewOnce } from "@/components/motion/use-in-view-once";

// Destaque laranja de UMA palavra num título (componente único; usado pelo SectionTitle).
// Duas camadas com o mesmo texto e o mesmo padding:
//   1) a palavra na cor do título (embaixo);
//   2) por cima, uma "cortina" com a barra laranja e a palavra BRANCA. A cortina entra de baixo para cima com duas
//      translações sincronizadas (o contêiner sobe de 101% a 0 e o conteúdo desce de -101% a 0), então a barra e o
//      texto branco aparecem juntos, linha por linha: em nenhum quadro há branco sobre branco.
// Só transform anima (compositor). Com prefers-reduced-motion, já aparece pronta (globals.css, .hl-*).
// Branco sobre a barra (#b94f01): 4,9:1 (texto grande pede 3:1; passa até o 4,5:1 de texto normal).
export function HighlightWord({ children }: { children: string }) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>();
  return (
    <span ref={ref} className="hl" data-in={inView || undefined}>
      <span className="hl-text">{children}</span>
      <span aria-hidden="true" className="hl-cover">
        <span className="hl-bar">{children}</span>
      </span>
    </span>
  );
}
