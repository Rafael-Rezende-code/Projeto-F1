import Image from "next/image";
import type { ReactNode } from "react";
import { ImageReveal } from "@/components/motion/image-reveal";

// Cabeçalho editorial das landings (coleções, categorias, presentes; refino 3, itens 1.4 e 3.4): rótulo laranja, título
// grande, frase e texto curto à esquerda; capa `rounded-2xl` à direita (abaixo do texto no celular). Sem animação que
// esconda texto: está acima da dobra. A capa entra com o fade padrão (ImageReveal), só se ainda não tiver carregado.
const COVER_SIZES = "(min-width: 1480px) 660px, (min-width: 1024px) calc((100vw - 120px) / 2), calc(100vw - 40px)";

export function EditorialHeader({
  eyebrow,
  title,
  phrase,
  intro,
  image,
  children,
}: {
  eyebrow: string;
  title: string;
  phrase?: string;
  intro?: string;
  image?: { src: string; alt: string; position?: string };
  children?: ReactNode;
}) {
  return (
    <header className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94f01]">{eyebrow}</p>
        <h1 className="text-5xl font-medium tracking-[-0.06em] text-black sm:text-6xl md:text-7xl">{title}</h1>
        {phrase && <p className="font-accent mt-4 text-2xl text-black/80 sm:text-3xl">{phrase}</p>}
        {intro && <p className="mt-5 max-w-xl text-sm leading-7 text-black/65 sm:text-base">{intro}</p>}
        {children}
      </div>
      {image && (
        <ImageReveal className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#e9e8e4] lg:aspect-[4/3]">
          <Image src={image.src} alt={image.alt} fill priority sizes={COVER_SIZES} quality={85} className="object-cover" style={image.position ? { objectPosition: image.position } : undefined} />
        </ImageReveal>
      )}
    </header>
  );
}
