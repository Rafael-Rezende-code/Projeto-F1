import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { navExtras } from "@/lib/nav-extras";

// Páginas internas da loja: cabeçalho sólido + rodapé do site. A home (app/page.tsx) tem o cabeçalho sobre o hero.
// [color-scheme:light]: o site não tem modo escuro; sem isso, selects, rádios e checkboxes nativos ficam escuros quando
// o sistema está em modo escuro (o globals.css troca color-scheme com prefers-color-scheme).
export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-white text-black [color-scheme:light]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-black focus:px-4 focus:py-3 focus:text-sm focus:text-white">
        Pular para o conteúdo
      </a>
      <SiteHeader extraLinks={await navExtras()} />
      <main id="conteudo" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
