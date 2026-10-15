"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Estado de interface compartilhado pelo site: menu mobile e busca. Abertos por botões do cabeçalho, do dock e
// por atalhos de teclado; um só aberto por vez.
type Panel = "menu" | "busca" | null;
type SiteUI = {
  panel: Panel;
  openMenu: () => void;
  openSearch: () => void;
  closePanel: () => void;
};

const SiteUIContext = createContext<SiteUI | null>(null);

export function SiteUIProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel>(null);
  const openMenu = useCallback(() => setPanel("menu"), []);
  const openSearch = useCallback(() => setPanel("busca"), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const value = useMemo(() => ({ panel, openMenu, openSearch, closePanel }), [panel, openMenu, openSearch, closePanel]);
  return <SiteUIContext.Provider value={value}>{children}</SiteUIContext.Provider>;
}

export function useSiteUI() {
  const value = useContext(SiteUIContext);
  if (!value) throw new Error("useSiteUI precisa estar dentro de <SiteUIProvider>");
  return value;
}
