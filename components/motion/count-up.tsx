"use client";

import { useEffect, useRef } from "react";
import { duration, viewport } from "@/lib/motion";

// Contador que sobe de 0 ao valor ao entrar na tela (refino 3, item 4.3; números dos pilotos). O HTML do servidor já traz o
// valor final (nada fica escondido antes do JavaScript); só anima o que estava FORA da tela ao montar, uma vez. O número
// animado dura ~1 s e termina no valor final. Escreve o texto direto no elemento
// (sem re-render por quadro; um só texto, então leitor de tela e testes veem o número), com a curva `out` aproximada (ease-out cúbica) e a duração `reveal` de lib/motion.ts.
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const numeric = /^\d{1,6}$/.test(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !numeric) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // já na tela: fica pronto
    const target = Number(value);
    el.textContent = "0";
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const total = duration.reveal * 1000;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / total);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: viewport.margin, threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = value;
    };
  }, [value, numeric]);

  return (
    <span ref={ref} className={`${numeric ? "tabular-nums" : ""} ${className ?? ""}`.trim() || undefined}>
      {value}
    </span>
  );
}
