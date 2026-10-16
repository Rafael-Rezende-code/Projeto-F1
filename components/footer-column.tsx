"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { NavLink } from "@/lib/navigation";

// Coluna de links do rodapé. Celular (< 640px): acordeão (o título vira botão com aria-expanded; os links ficam no HTML,
// só escondidos, bons para SEO). A partir de 640px: título fixo e links sempre visíveis, como antes.
export function FooterColumn({ heading, links }: { heading: string; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-white/10 sm:border-0">
      <h3 className="hidden mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 sm:block">{heading}</h3>
      <h3 className="sm:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-12 w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60"
        >
          {heading}
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-[var(--motion-short)] ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={id} className={`${open ? "flex" : "hidden"} flex-col gap-3 pb-6 text-sm text-white/70 sm:flex sm:pb-0`}>
        {links.map((link) => (
          <Link href={link.href} key={link.label} className="transition hover:text-white">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
