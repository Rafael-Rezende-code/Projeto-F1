"use client";

import { BRAND } from "@/lib/brand";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CartButton } from "@/components/cart";
import { SearchButton } from "@/components/search-root";
import { headerLinks, type NavLink } from "@/lib/navigation";

// Cabeçalho do site (home e páginas internas).
// - Desktop (md+): cartão branco SÓLIDO flutuante (12px do topo, 16px das laterais, rounded-2xl, borda sutil e sombra),
//   igual sobre o hero e nas internas. Na home é fixo sobre o hero; nas internas é sticky e ocupa espaço no fluxo (não
//   cobre o topo da página). Esconde ao rolar para baixo e reaparece ao rolar para cima ou ao receber foco (teclado).
// - Celular (< 768px): só a marca, pequena e centralizada, NÃO fixa (rola com a página): sobre o hero na home (branca)
//   e no fluxo nas internas. Busca, sacola e menu ficam só no dock (components/mobile-dock.tsx).
// Sem salto de layout: esconder é só translateY. O scroll é lido num requestAnimationFrame e só muda estado quando muda.
const HIDE_AFTER = 120;
const DELTA = 6;

/** `extraLinks`: links que só existem quando há conteúdo (ex.: "Drops"; lib/nav-extras.ts, decidido no servidor). */
export function SiteHeader({ variant = "solid", extraLinks = [] }: { variant?: "overlay" | "solid"; extraLinks?: NavLink[] }) {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      ticking.current = false;
      const y = window.scrollY;
      const delta = y - last.current;
      if (Math.abs(delta) >= DELTA) {
        // Não esconde enquanto um painel (menu, sacola, busca) trava a rolagem da página.
        if (document.body.style.overflow !== "hidden") setHidden(delta > 0 && y > HIDE_AFTER);
        last.current = y;
      }
      if (y <= HIDE_AFTER) setHidden(false);
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overlay = variant === "overlay";

  return (
    <header
      onFocusCapture={() => setHidden(false)}
      data-hidden={hidden || undefined}
      className={`${overlay ? "absolute inset-x-0 md:fixed" : "relative md:sticky"} top-0 z-40 md:pointer-events-none md:px-4 md:pt-3 md:transition-transform md:duration-[var(--motion-medium)] md:ease-[var(--ease-out)] ${
        hidden ? "md:-translate-y-[calc(100%+16px)] md:focus-within:translate-y-0" : ""
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1400px] items-center justify-center px-5 py-4 md:pointer-events-auto md:justify-between md:rounded-2xl md:border md:border-black/10 md:bg-white md:px-7 md:py-3.5 md:text-black md:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] ${
          overlay ? "text-white" : "border-b border-black/10 text-black"
        }`}
      >
        <Link href="/" className="font-playfair text-2xl italic tracking-[-0.07em] md:text-3xl" aria-label={`${BRAND.name}, início`}>
          {BRAND.name}<span className={overlay ? "text-[#e8702a] md:text-[#b94f01]" : "text-[#b94f01]"}>{BRAND.mark}</span>
        </Link>
        <nav className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.18em] md:flex" aria-label="Navegação principal">
          {[...headerLinks, ...extraLinks].map((link) => (
            <Link key={link.href} href={link.href} className="transition-opacity hover:opacity-60">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <SearchButton className="transition-opacity hover:opacity-60" />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
