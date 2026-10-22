"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageReveal } from "@/components/motion/image-reveal";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { SharedTransition } from "@/components/motion/view-transition";
import { useModal } from "@/components/use-modal";
import type { ProductImage } from "@/lib/catalog/types";

// Galeria da página de produto: imagem principal + miniaturas. Clicar na foto abre a lightbox em tela cheia
// (setas, teclado ← →, Esc fecha, foco preso). A imagem principal recebe a View Transition vinda do card.
const MAIN_SIZES = "(min-width: 1480px) 680px, (min-width: 1024px) calc((100vw - 80px) * 0.55), calc(100vw - 40px)";

export function ProductGallery({ images, name, transitionName }: { images: ProductImage[]; name: string; transitionName?: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useModal(zoom, panelRef, () => setZoom(false));
  const current = images[active] ?? images[0];
  const step = (delta: number) => setActive((index) => (index + delta + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      <SharedTransition name={transitionName}>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={`Ampliar foto: ${current.alt}`}
        className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-[#e9e8e4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
      >
        <ImageReveal key={current.src} className="absolute inset-0">
          <Image src={current.src} alt={current.alt} fill priority sizes={MAIN_SIZES} quality={85} className="object-cover" />
        </ImageReveal>
        <span aria-hidden="true" className="absolute bottom-3 right-3 rounded-xl bg-white/85 p-2 text-black opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Expand size={16} />
        </span>
      </button>
      </SharedTransition>
      {images.length > 1 && (
        <div className="flex gap-3" role="group" aria-label={`Imagens de ${name}`}>
          {images.map((image, index) => (
            <button
              key={image.src + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-pressed={index === active}
              className={`relative aspect-square w-20 overflow-hidden rounded-xl bg-[#e9e8e4] transition sm:w-24 ${index === active ? "ring-2 ring-black ring-offset-2" : "opacity-70 hover:opacity-100"}`}
            >
              <Image src={image.src} alt="" fill sizes="96px" quality={75} className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${name}`}
          className="fixed inset-0 z-[97] flex flex-col bg-black/95 text-white [color-scheme:dark]"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm text-white/70" aria-live="polite">
              {active + 1} / {images.length}
            </p>
            <button type="button" data-autofocus onClick={() => setZoom(false)} aria-label="Fechar fotos" className="rounded-xl p-2 transition hover:bg-white/10">
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Image src={current.src} alt={current.alt} fill sizes="100vw" quality={90} className="object-contain" />
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-3 backdrop-blur transition hover:bg-white/20">
                  <ChevronLeft size={22} />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 p-3 backdrop-blur transition hover:bg-white/20">
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
          <p className="px-5 py-4 text-center text-xs text-white/60">{current.alt}</p>
        </div>
      )}
    </div>
  );
}
