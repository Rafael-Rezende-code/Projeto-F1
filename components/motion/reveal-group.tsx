"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type ElementType } from "react";
import { STAGGER_CAP, viewport } from "@/lib/motion";

type Props<T extends ElementType> = { as?: T; /** índice máximo para o atraso (cards além disso entram juntos) */ maxIndex?: number } & ComponentPropsWithoutRef<T>;

// Entrada escalonada (fade + subida curta) de uma grade de cards, uma única vez, ao rolar até ela.
// Leve: só um IntersectionObserver por grade e transições em CSS (globals.css, [data-reveal]); nada por card em JS.
// O HTML do servidor fica visível; depois de montar, se a grade ainda estiver fora da tela, os cards são escondidos
// e entram quando ela aparece. Grade já visível ao carregar não anima (evita piscar o que já estava na tela).
export function RevealGroup<T extends ElementType = "ul">({ as, maxIndex = STAGGER_CAP, ...rest }: Props<T>) {
  const Tag = (as ?? "ul") as ElementType;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // já na tela
    [...el.children].forEach((child, index) => (child as HTMLElement).style.setProperty("--i", String(Math.min(index, maxIndex))));
    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "in";
        observer.disconnect();
      },
      { rootMargin: viewport.margin, threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxIndex]);

  return <Tag ref={ref} {...rest} />;
}
