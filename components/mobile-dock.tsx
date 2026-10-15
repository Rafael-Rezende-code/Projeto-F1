"use client";

import { usePathname, useRouter } from "next/navigation";
import { Flag, House, Menu, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart";
import { useSiteUI } from "@/components/site-ui";
import { MagneticDock, type DockItemData } from "@/components/ui/magnetic-dock";

// Dock fixo embaixo, só no celular (< 768px), variante glass, acima da área segura do iPhone.
// Escondido no checkout e na confirmação do pedido. Um espaçador na cor do rodapé, no fim da página, garante que o
// dock não cubra o rodapé; a variável --dock-space (globals.css) posiciona o que precisa ficar acima dele
// (aviso da sacola, barra fixa de compra do produto).
const HIDDEN_ON = ["/checkout", "/pedido"];

export function MobileDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { count, open: openCart, isOpen: cartOpen } = useCart();
  const { openSearch, openMenu, panel } = useSiteUI();
  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  const items: DockItemData[] = [
    { id: "inicio", label: "Início", icon: <House strokeWidth={1.75} />, onClick: () => router.push("/"), isActive: pathname === "/" && !panel && !cartOpen },
    { id: "buscar", label: "Buscar", icon: <Search strokeWidth={1.75} />, onClick: openSearch, isActive: panel === "busca" },
    {
      id: "equipes",
      label: "Equipes",
      icon: <Flag strokeWidth={1.75} />,
      onClick: () => router.push("/equipes"),
      isActive: pathname.startsWith("/equipes") && !panel && !cartOpen,
    },
    {
      id: "sacola",
      label: count > 0 ? `Sacola, ${count} ${count === 1 ? "item" : "itens"}` : "Sacola",
      icon: <ShoppingBag strokeWidth={1.75} />,
      onClick: openCart,
      isActive: cartOpen || pathname.startsWith("/carrinho"),
      badge: count,
    },
    { id: "menu", label: "Menu", icon: <Menu strokeWidth={1.75} />, onClick: openMenu, isActive: panel === "menu" },
  ];

  return (
    <>
      <div aria-hidden="true" className="h-[var(--dock-space)] bg-[#080808] md:hidden" />
      <nav aria-label="Atalhos" className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
        <MagneticDock items={items} iconSize={44} maxScale={1} showLabels={false} variant="glass" className="pointer-events-auto [color-scheme:light]" />
      </nav>
    </>
  );
}
