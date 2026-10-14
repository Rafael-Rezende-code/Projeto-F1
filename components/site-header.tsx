import Link from "next/link";
import { Menu } from "lucide-react";
import { CartButton } from "@/components/cart";
import { headerLinks } from "@/lib/navigation";

// Cabeçalho das páginas internas: mesmos itens do cabeçalho da home, em versão sólida (fundo branco, texto preto).
// No celular, o menu abre com <details> (sem JS).
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
          <details className="relative md:hidden">
            <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden" aria-label="Abrir menu">
              <Menu strokeWidth={1.5} />
            </summary>
            <nav aria-label="Navegação principal" className="absolute right-0 top-10 z-50 flex w-48 flex-col rounded-xl border border-black/10 bg-white p-2 text-sm shadow-xl">
              {headerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 hover:bg-black/5">
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
