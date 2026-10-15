"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useSiteUI } from "@/components/site-ui";

// Parte leve da busca, sempre carregada: botão do cabeçalho e atalho Ctrl/Cmd+K. A sobreposição
// (components/search-overlay.tsx, com resultados, imagens e server actions) fica fora do JS inicial: é pré-carregada
// quando o navegador fica ocioso (ou no hover/foco do ícone) e montada fechada, para a primeira abertura já animar.
const loadOverlay = () => import("@/components/search-overlay");
const SearchOverlay = dynamic(() => loadOverlay().then((m) => m.SearchOverlay), { ssr: false });

/** Pré-carrega o módulo da busca (ocioso, hover ou foco no ícone) e avisa quando ele está pronto. */
let preloaded: Promise<unknown> | null = null;
export function preloadSearch() {
  preloaded ??= loadOverlay();
  return preloaded;
}

export function SearchButton({ className = "" }: { className?: string }) {
  const { openSearch, panel } = useSiteUI();
  return (
    <button type="button" onClick={openSearch} onPointerEnter={() => void preloadSearch()} onFocus={() => void preloadSearch()} aria-label="Buscar (Ctrl+K)" aria-haspopup="dialog" aria-expanded={panel === "busca"} className={className}>
      <Search strokeWidth={1.5} />
    </button>
  );
}

export function SearchRoot() {
  const { panel, openSearch } = useSiteUI();
  const [loaded, setLoaded] = useState(false);
  if (panel === "busca" && !loaded) setLoaded(true);

  // Quando o navegador fica ocioso, baixa o módulo e já monta a busca FECHADA: a primeira abertura anima igual às outras.
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = ric(() => void preloadSearch().then(() => setLoaded(true)));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  return loaded ? <SearchOverlay /> : null;
}
