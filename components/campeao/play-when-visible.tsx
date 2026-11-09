"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Anima só quando está na tela: fora dela, as animações CSS em loop (selo, brilho, zoom e luz da bandeira) ficam pausadas
// (CSS [data-pausado] em globals.css). Desempenho: nada roda escondido. Começa pausado (o servidor não sabe).
export function PlayWhenVisible({ as: Tag = "div", className, children, rootMargin = "10% 0px", ...rest }: { as?: "div" | "section" | "article"; className?: string; children: ReactNode; /** antecipa a retomada (ex.: trocar a fonte antes de aparecer) */ rootMargin?: string } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return (
    <Tag ref={ref as never} className={className} data-pausado={visible ? undefined : ""} {...rest}>
      {children}
    </Tag>
  );
}
