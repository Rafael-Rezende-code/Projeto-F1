"use client";

import dynamic from "next/dynamic";
import { useSiteUI } from "@/components/site-ui";
import { useEffect, useState } from "react";

// Peças de interface carregadas fora do caminho crítico (não entram no JS inicial de cada página):
// - dock do celular: baixa logo após a hidratação (ssr: false); no desktop o componente nem aparece (md:hidden);
// - menu mobile: pré-carregado no ocioso e montado fechado (ou na primeira abertura, se vier antes).
const MobileDock = dynamic(() => import("@/components/mobile-dock").then((m) => m.MobileDock), { ssr: false });
const loadMenu = () => import("@/components/mobile-menu");
const MobileMenu = dynamic(() => loadMenu().then((m) => m.MobileMenu), { ssr: false });

export function LazyShell({ collections }: { collections: { label: string; href: string }[] }) {
  const { panel } = useSiteUI();
  const [menuLoaded, setMenuLoaded] = useState(false);
  if (panel === "menu" && !menuLoaded) setMenuLoaded(true);
  // Pré-carrega o menu no ocioso e o monta fechado: a primeira abertura anima como as seguintes.
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = ric(() => void loadMenu().then(() => setMenuLoaded(true)));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, []);
  return (
    <>
      <MobileDock />
      {menuLoaded && <MobileMenu collections={collections} />}
    </>
  );
}
