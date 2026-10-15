"use client";

import dynamic from "next/dynamic";
import { useSiteUI } from "@/components/site-ui";
import { useState } from "react";

// Peças de interface carregadas fora do caminho crítico (não entram no JS inicial de cada página):
// - dock do celular: baixa logo após a hidratação (ssr: false); no desktop o componente nem aparece (md:hidden);
// - menu mobile: só na primeira abertura.
const MobileDock = dynamic(() => import("@/components/mobile-dock").then((m) => m.MobileDock), { ssr: false });
const MobileMenu = dynamic(() => import("@/components/mobile-menu").then((m) => m.MobileMenu), { ssr: false });

export function LazyShell() {
  const { panel } = useSiteUI();
  const [menuLoaded, setMenuLoaded] = useState(false);
  if (panel === "menu" && !menuLoaded) setMenuLoaded(true);
  return (
    <>
      <MobileDock />
      {menuLoaded && <MobileMenu />}
    </>
  );
}
