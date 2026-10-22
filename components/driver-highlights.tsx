import Image from "next/image";
import Link from "next/link";
import { CueReveal } from "@/components/motion/cue-reveal";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/catalog/types";

// Miniaturas compactas de produtos do piloto (foto, nome e preço), clicáveis. Ficam no espaço ao lado do nome no topo
// da página do piloto quando não há carro; com carro, descem para uma linha logo abaixo do topo (`tone="light"`).
// Entram coreografadas depois da assinatura (CueReveal, sinal da foto principal + `delay`).
export function DriverHighlights({
  products,
  cue,
  delay,
  tone = "team",
  label,
  className = "",
}: {
  products: Product[];
  cue: string;
  delay: number;
  /** team: sobre a cor da equipe (topo); light: sobre o fundo claro (linha abaixo do topo) */
  tone?: "team" | "light";
  label: string;
  className?: string;
}) {
  if (products.length === 0) return null;
  return (
    <div className={className}>
      <p className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] ${tone === "team" ? "text-white" : "text-[#b94f01]"}`}>{label}</p>
      <CueReveal as="ul" cue={cue} delay={delay} className="grid max-w-[540px] grid-cols-3 gap-2 sm:gap-3">
        {products.map((product) => (
          <li key={product.slug}>
            <Link
              href={`/produtos/${product.slug}`}
              className={`group flex h-full flex-col rounded-2xl bg-white p-1.5 text-black transition-transform duration-[var(--motion-short)] ease-[var(--ease-out)] hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-2 ${tone === "team" ? "focus-visible:outline-white" : "shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/5 focus-visible:outline-black"}`}
            >
              <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#e9e8e4]">
                <Image src={product.images[0].src} alt="" fill sizes="(min-width: 768px) 170px, 30vw" quality={75} className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </span>
              <span className="mt-2 line-clamp-2 px-0.5 text-[11px] leading-4 sm:text-xs">{product.name}</span>
              <span className="mt-auto px-0.5 pb-0.5 pt-1 text-[11px] font-semibold sm:text-xs">{formatPrice(product.priceCents)}</span>
            </Link>
          </li>
        ))}
      </CueReveal>
    </div>
  );
}
