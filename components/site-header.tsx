import Link from "next/link";
import { CartButton } from "@/components/cart";
import { MenuButton } from "@/components/mobile-menu";
import { headerLinks } from "@/lib/navigation";

// Cabeçalho das páginas internas: mesmos itens do cabeçalho da home, em versão sólida (fundo branco, texto preto).
// No celular, o botão abre o menu em tela cheia (components/mobile-menu.tsx).
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 text-black backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-10">
        <Link href="/" className="font-playfair text-3xl italic tracking-[-0.07em]" aria-label="Apex início">
          Apex<span className="text-[#b94f01]">.</span>
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
