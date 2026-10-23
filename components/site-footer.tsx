import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { FooterColumn } from "@/components/footer-column";
import { SocialIcon } from "@/components/social-icons";
import { company, companyFacts } from "@/lib/company";
import { footerColumns, legalLinks } from "@/lib/navigation";
import { socialLinks, whatsappLink } from "@/lib/social";
import { whatsappMessages } from "@/lib/store-policy";
import { MessageCircle } from "lucide-react";
import { ConsentPreferencesButton } from "@/components/consent";

// Rodapé do site (home e páginas internas). Mesmo visual do rodapé original da home; links em lib/navigation.ts.
export function SiteFooter() {
  // WhatsApp (lib/social.ts): mesmo link do botão flutuante, com a mensagem geral. Sem número, nada aparece.
  const whatsapp = whatsappLink(whatsappMessages.generic());
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
      {/* Identificação do fornecedor (Decreto 7.962/2013). Dados em lib/company.ts: só os preenchidos aparecem. */}
      <address className="mx-auto mt-16 flex max-w-[1400px] flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-6 text-xs not-italic leading-5 text-white/50">
        <span>{company.tradeName}</span>
        {companyFacts().map((fact) => (
          <span key={fact.key}>
            {fact.key === "document" && `${fact.label} `}
            {fact.href ? (
              <a href={fact.href} className="underline-offset-4 transition hover:text-white hover:underline">{fact.value}</a>
            ) : (
              fact.value
            )}
          </span>
        ))}
      </address>
      <div className="mx-auto mt-6 flex max-w-[1400px] flex-col justify-between gap-5 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.12em] text-white/50 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <span>© 2026 {BRAND.name}. Todos os direitos reservados.</span>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
          <ConsentPreferencesButton className="transition hover:text-white" />
        </div>
        {/* Redes: só as que têm URL configurada (lib/social.ts, NEXT_PUBLIC_SOCIAL_*); sem nenhuma, nada aparece. */}
        {(socialLinks.length > 0 || whatsapp) && (
          <ul className="flex gap-1" aria-label="Redes sociais e WhatsApp">
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da loja (abre em outra aba)" className="flex size-11 items-center justify-center rounded-xl transition hover:bg-white/10 hover:text-white">
                  <MessageCircle size={16} aria-hidden="true" />
                </a>
              </li>
            )}
            {socialLinks.map((link) => (
              <li key={link.network}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (abre em outra aba)`} className="flex size-11 items-center justify-center rounded-xl transition hover:bg-white/10 hover:text-white">
                  <SocialIcon network={link.network} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
