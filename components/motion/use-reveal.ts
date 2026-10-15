"use client";

import { useEffect, useRef } from "react";
import { viewport } from "@/lib/motion";

// Entrada ao rolar sem esconder o que já está na tela: depois de montar, se o elemento ainda estiver fora da tela,
// marca `data-<attr>="pending"` (o CSS esconde) e troca para "in" quando ele aparece (o CSS anima). O que já está
// visível ao carregar não recebe nada e aparece pronto, direto do HTML do servidor. Um IntersectionObserver por bloco.
export function useReveal<T extends HTMLElement>(attr: "reveal" | "revealText") {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    el.dataset[attr] = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset[attr] = "in";
        observer.disconnect();
      },
      { rootMargin: viewport.margin, threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [attr]);
  return ref;
}
