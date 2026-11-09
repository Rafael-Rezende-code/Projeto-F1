"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Anima só quando está na tela: fora dela, as animações CSS em loop (selo, brilho, zoom e luz da bandeira) ficam pausadas
// (CSS [data-pausado] em globals.css). Desempenho: nada roda escondido. Começa pausado (o servidor não sabe).
export function PlayWhenVisible({ as: Tag = "div", className, children, ...rest }: { as?: "div" | "section"; className?: string; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "10% 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={className} data-pausado={visible ? undefined : ""} {...rest}>
      {children}
    </Tag>
  );
}
