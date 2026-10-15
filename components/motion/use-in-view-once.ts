"use client";

import { useEffect, useRef, useState } from "react";
import { viewport } from "@/lib/motion";

// true depois que o elemento entra na tela (uma vez só). Um IntersectionObserver por elemento, desligado ao disparar.
export function useInViewOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: viewport.margin, threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}
