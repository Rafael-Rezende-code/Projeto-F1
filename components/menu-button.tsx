"use client";

import { Menu } from "lucide-react";
import { useSiteUI } from "@/components/site-ui";

// Botão de menu (cabeçalho, só no celular). Arquivo leve: o painel do menu (mobile-menu.tsx) é carregado sob demanda.
export function MenuButton({ className = "" }: { className?: string }) {
  const { openMenu, panel } = useSiteUI();
  return (
    <button type="button" onClick={openMenu} aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={panel === "menu"} aria-controls="menu-principal" className={className}>
      <Menu strokeWidth={1.5} />
    </button>
  );
}
