"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useSiteUI } from "@/components/site-ui";
import { useModal } from "@/components/use-modal";
import { menuLinks, menuSecondaryLinks } from "@/lib/navigation";

// Botão de menu (cabeçalho, só no celular). `tone` acompanha o cabeçalho: claro sobre o hero, escuro nas internas.
export function MenuButton({ className = "" }: { className?: string }) {
  const { openMenu, panel } = useSiteUI();
  return (
    <button type="button" onClick={openMenu} aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={panel === "menu"} aria-controls="menu-principal" className={className}>
      <Menu strokeWidth={1.5} />
    </button>
  );
}

// Menu em tela cheia (celular). Diálogo modal: foco preso, Esc e o X fecham, e qualquer link fecha ao navegar.
export function MobileMenu() {
  const { panel, closePanel } = useSiteUI();
  const pathname = usePathname();
  const open = panel === "menu";
  const panelRef = useRef<HTMLDivElement>(null);
  useModal(open, panelRef, closePanel);

  return (
    <div className={`fixed inset-0 z-[95] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={closePanel} className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={panelRef}
        id="menu-principal"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 text-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [color-scheme:light] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">Menu</span>
          <button type="button" data-autofocus onClick={closePanel} aria-label="Fechar menu" className="rounded-xl p-2 transition hover:bg-black/5">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        <nav aria-label="Navegação principal" className="mt-8">
          <ul role="list" className="flex flex-col">
            {menuLinks.map((link) => {
              const current = link.href === pathname;
              return (
                <li key={link.href} className="border-b border-black/10">
                  <Link
                    href={link.href}
                    onClick={closePanel}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-center justify-between py-4 text-3xl font-medium tracking-[-0.05em] transition hover:text-[#b94f01] ${current ? "text-[#b94f01]" : ""}`}
                  >
                    {link.label}
                    <span aria-hidden="true" className="text-base text-black/30">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ul role="list" className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-black/70">
          {menuSecondaryLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={closePanel} className="hover:text-black">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
