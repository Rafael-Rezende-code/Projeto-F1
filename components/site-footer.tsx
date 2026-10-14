import Link from "next/link";
import { CirclePlay, Globe } from "lucide-react";
import { footerColumns } from "@/lib/navigation";

// Rodapé do site (home e páginas internas). Mesmo visual do rodapé original da home; links em lib/navigation.ts.
export function SiteFooter() {
  return (
    <footer className="bg-[#080808] px-5 py-16 text-white sm:px-10 sm:py-20">
      <div className="mx-auto grid max-w-[1400px] gap-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="font-playfair text-4xl italic tracking-[-0.08em]">
            Apex<span className="text-[#e8702a]">.</span>
          </Link>
          <p className="mt-5 max-w-[210px] text-sm leading-6 text-white/50">Cultura, roupas e colecionáveis premium de Fórmula 1.</p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.heading}>
            <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">{column.heading}</h3>
            <div className="flex flex-col gap-3 text-sm text-white/70">
              {column.links.map((link) => (
                <Link href={link.href} key={link.label} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-16 flex max-w-[1400px] flex-col justify-between gap-5 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.12em] text-white/50 sm:flex-row">
        <span>© 2026 Apex. Todos os direitos reservados.</span>
        <div className="flex gap-5">
          <a href="#top" aria-label="Instagram"><Globe size={15} /></a>
          <a href="#top" aria-label="TikTok"><CirclePlay size={15} /></a>
          <a href="#top" aria-label="YouTube"><CirclePlay size={15} /></a>
        </div>
      </div>
    </footer>
  );
}
