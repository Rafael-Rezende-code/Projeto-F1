"use client";

import { useEffect, useState } from "react";
import { useInViewOnce } from "@/components/motion/use-in-view-once";
import { duration } from "@/lib/motion";

// Destaque laranja de UMA palavra num título (componente único; usado pelo SectionTitle).
// Duas camadas com o mesmo texto e o mesmo padding:
//   1) a palavra na cor do título (embaixo);
//   2) por cima, uma "cortina" com a barra laranja e a palavra BRANCA. A cortina entra de baixo para cima com duas
//      translações sincronizadas (o contêiner sobe de 101% a 0 e o conteúdo desce de -101% a 0), então a barra e o
//      texto branco aparecem juntos, linha por linha: em nenhum quadro há branco sobre branco.
// Ao terminar, `data-done` passa o laranja para a palavra estática e esconde a cortina (sem camada composta, sem fio
// escuro na borda em nenhum zoom). Só transform anima. Com prefers-reduced-motion, já aparece pronta (globals.css).
// Branco sobre a barra (#b94f01): 4,9:1 (texto grande pede 3:1; passa até o 4,5:1 de texto normal).
const DELAY = 0.15; // igual ao atraso da transição no globals.css

export function HighlightWord({ children }: { children: string }) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!inView) return;
    // Margem de 50 ms além da transição; o resultado final é o mesmo quadro que a cortina mostra.
    const timer = window.setTimeout(() => setDone(true), (duration.long + DELAY) * 1000 + 50);
    return () => window.clearTimeout(timer);
  }, [inView]);
  return (
    <span ref={ref} className="hl" data-in={inView || undefined} data-done={done || undefined}>
      <span className="hl-text">{children}</span>
      <span aria-hidden="true" className="hl-cover">
        <span className="hl-bar">{children}</span>
      </span>
    </span>
  );
}
