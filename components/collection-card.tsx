import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ImageReveal } from "@/components/motion/image-reveal";

// Card de coleção/categoria (home, /colecoes, refino 3). Hover (mapa em lib/motion.ts, `hover.collection`): zoom sutil
// da foto (1,04, duração longa) e a seta que desliza na diagonal. Nada mais anima no card (sem brigar com a entrada da
// grade, que é do RevealGroup no contêiner).
const SIZES = "(min-width: 1480px) 341px, (min-width: 1024px) calc((100vw - 116px) / 4), (min-width: 640px) calc((100vw - 92px) / 2), calc(100vw - 40px)";

export function CollectionCard({ href, title, subtitle, image, eyebrow, sizes = SIZES }: { href: string; title: string; subtitle?: string; image: { src: string; alt?: string; position?: string }; eyebrow?: string; sizes?: string }) {
  return (
    <Link href={href} className="group relative block aspect-[0.82] overflow-hidden rounded-2xl bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
      <ImageReveal className="absolute inset-0">
        <Image src={image.src} alt="" fill sizes={sizes} quality={85} className="hover-zoom object-cover" style={image.position ? { objectPosition: image.position } : undefined} />
      </ImageReveal>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10 transition-opacity duration-500 group-hover:opacity-90" />
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white">
        <div>
          {eyebrow && <p className="mb-3 text-[10px] tracking-[0.2em] text-white/70">{eyebrow}</p>}
          <h3 className="text-2xl font-medium tracking-[-0.05em]">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-white/75">{subtitle}</p>}
        </div>
        <ArrowUpRight aria-hidden="true" className="hover-arrow shrink-0" />
      </div>
    </Link>
  );
}
