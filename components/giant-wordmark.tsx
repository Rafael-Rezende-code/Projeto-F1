"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";

// Nome da marca em tipografia gigante ocupando a largura do container (rodapé). É um SVG cujo viewBox é ajustado ao
// tamanho real do texto depois de montar: serve para qualquer nome em lib/brand.ts, sem calcular tamanho de fonte.
// Decorativo (aria-hidden): o nome já aparece no logo do rodapé.
export function GiantWordmark({ className = "" }: { className?: string }) {
  const textRef = useRef<SVGTextElement>(null);
  const [box, setBox] = useState("0 0 1000 260");

  useLayoutEffect(() => {
    const fit = () => {
      const bbox = textRef.current?.getBBox();
      if (bbox && bbox.width) setBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    };
    fit();
    void document.fonts?.ready.then(fit);
  }, []);

  return (
    <svg aria-hidden="true" viewBox={box} preserveAspectRatio="xMidYMid meet" className={`block h-auto w-full ${className}`}>
      <text
        ref={textRef}
        x="0"
        y="200"
        fill="currentColor"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontSize: 240, fontWeight: 800, fontStretch: "125%", letterSpacing: "-0.04em" }}
      >
        {BRAND.name}
        <tspan fill={BRAND.accentOnDark}>{BRAND.mark}</tspan>
      </text>
    </svg>
  );
}
