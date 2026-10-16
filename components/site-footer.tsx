import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { CirclePlay, Globe } from "lucide-react";
import { FooterColumn } from "@/components/footer-column";
import { company } from "@/lib/company";
import { footerColumns, legalLinks } from "@/lib/navigation";

// Rodapé do site (home e páginas internas). Mesmo visual do rodapé original da home; links em lib/navigation.ts.
export function SiteFooter() {
  return (
    <footer className="bg-[#080808] px-5 py-16 text-white sm:px-10 sm:py-20">
      {/* Celular: grupos de links em acordeão (FooterColumn); dados da empresa sempre visíveis, abaixo. */}
      <div className="mx-auto grid max-w-[1400px] sm:grid-cols-2 sm:gap-12 lg:grid-cols-4">
        <div>
          <Link href="/" className="font-playfair text-4xl italic tracking-[-0.08em]">
            {BRAND.name}<span className="text-[#e8702a]">{BRAND.mark}</span>
          </Link>
          <p className="mt-5 max-w-[210px] text-sm leading-6 text-white/50">Cultura, roupas e colecionáveis premium de Fórmula 1.</p>
        </div>
        {/* espaço entre a marca e os acordeões no celular */}
        <div aria-hidden="true" className="h-8 sm:hidden" />
        {footerColumns.map((column) => (
          <FooterColumn key={column.heading} heading={column.heading} links={column.links} />
        ))}
      </div>
      {/* Identificação do fornecedor (Decreto 7.962/2013). Dados em lib/company.ts (placeholders até o lançamento). */}
      <address className="mx-auto mt-16 grid max-w-[1400px] gap-x-8 gap-y-2 border-t border-white/10 pt-6 text-xs not-italic leading-5 text-white/50 sm:grid-cols-2 lg:grid-cols-4">
        <span>{company.legalName}</span>
        <span>CNPJ {company.cnpj}</span>
        <span>{company.address}</span>
        <span>
          {company.email} · {company.phone}
        </span>
      </address>
      <div className="mx-auto mt-6 flex max-w-[1400px] flex-col justify-between gap-5 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.12em] text-white/50 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <span>© 2026 {BRAND.name}. Todos os direitos reservados.</span>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-5">
          <a href="#top" aria-label="Instagram"><Globe size={15} /></a>
          <a href="#top" aria-label="TikTok"><CirclePlay size={15} /></a>
          <a href="#top" aria-label="YouTube"><CirclePlay size={15} /></a>
        </div>
      </div>
    </footer>
  );
}
