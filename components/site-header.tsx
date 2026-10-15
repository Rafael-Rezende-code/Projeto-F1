"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CartButton } from "@/components/cart";
import { MenuButton } from "@/components/mobile-menu";
import { headerLinks } from "@/lib/navigation";

// Cabeçalho do site (home e páginas internas).
// - variant "overlay" (home): fixo e transparente sobre o hero, com texto claro; ao rolar ganha fundo com desfoque,
//   borda sutil e texto escuro.
// - variant "solid" (internas): sticky, já começa com fundo.
// Nos dois: esconde ao rolar para baixo e reaparece ao rolar para cima; reaparece também ao receber foco (teclado).
// Sem salto de layout: o overlay é fixo (o hero já fica por baixo) e o solid ocupa o mesmo espaço o tempo todo
// (esconder é só translateY). O scroll é lido num requestAnimationFrame e só muda estado quando algo muda.
const SCROLLED_AT = 12;
const HIDE_AFTER = 120;
const DELTA = 6;

export function SiteHeader({ variant = "solid" }: { variant?: "overlay" | "solid" }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      ticking.current = false;
      const y = window.scrollY;
      setScrolled(y > SCROLLED_AT);
      const delta = y - last.current;
      if (Math.abs(delta) >= DELTA) {
        // Não esconde enquanto um painel (menu, sacola, busca) trava a rolagem da página.
        if (document.body.style.overflow !== "hidden") setHidden(delta > 0 && y > HIDE_AFTER);
        last.current = y;
      }
      if (y <= SCROLLED_AT) setHidden(false);
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
  const light = overlay && !scrolled; // texto claro sobre o hero
  const filled = !overlay || scrolled;

  return (
    <header
      onFocusCapture={() => setHidden(false)}
      data-hidden={hidden || undefined}
      className={`${overlay ? "fixed inset-x-0" : "sticky"} top-0 z-40 transition-[transform,background-color,border-color,color,backdrop-filter] duration-[var(--motion-base)] ease-[var(--ease-out)] ${
        hidden ? "-translate-y-full focus-within:translate-y-0" : "translate-y-0"
      } ${filled ? "border-b border-black/10 bg-white/80 text-black backdrop-blur-xl backdrop-saturate-150" : "border-b border-transparent bg-transparent text-white"}`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
        <Link href="/" className="font-playfair text-3xl italic tracking-[-0.07em]" aria-label="Apex início">
          Apex<span className={light ? "text-[#e8702a]" : "text-[#b94f01]"}>.</span>
        </Link>
        <nav className="hidden items-center gap-10 text-[11px] font-medium uppercase tracking-[0.18em] md:flex" aria-label="Navegação principal">
          {headerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-opacity hover:opacity-60">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <CartButton />
          <MenuButton className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
