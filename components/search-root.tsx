"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useSiteUI } from "@/components/site-ui";

// Parte leve da busca, sempre carregada: botão do cabeçalho e atalho Ctrl/Cmd+K. A sobreposição
// (components/search-overlay.tsx, com resultados, imagens e server actions) só é baixada na primeira abertura.
const SearchOverlay = dynamic(() => import("@/components/search-overlay").then((m) => m.SearchOverlay), { ssr: false });

export function SearchButton({ className = "" }: { className?: string }) {
  const { openSearch, panel } = useSiteUI();
  return (
    <button type="button" onClick={openSearch} aria-label="Buscar (Ctrl+K)" aria-haspopup="dialog" aria-expanded={panel === "busca"} className={className}>
      <Search strokeWidth={1.5} />
    </button>
  );
}

export function SearchRoot() {
  const { panel, openSearch } = useSiteUI();
  const [loaded, setLoaded] = useState(false);
  if (panel === "busca" && !loaded) setLoaded(true); // depois de aberta uma vez, fica montada (anima ao fechar)

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
