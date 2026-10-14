"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/catalog/types";

// Galeria da página de produto: imagem principal + miniaturas (botões). Imagens que encostam nas bordas do bloco
// seguem a escala de arredondamento (rounded-2xl para a principal, rounded-xl para as miniaturas).
const MAIN_SIZES = "(min-width: 1480px) 680px, (min-width: 1024px) calc((100vw - 80px) * 0.55), calc(100vw - 40px)";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e8e4]">
        <Image key={current.src} src={current.src} alt={current.alt} fill priority sizes={MAIN_SIZES} quality={85} className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3" role="group" aria-label={`Imagens de ${name}`}>
          {images.map((image, index) => (
            <button
              key={image.src + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-pressed={index === active}
              className={`relative aspect-square w-20 overflow-hidden rounded-xl bg-[#e9e8e4] transition sm:w-24 ${
                index === active ? "ring-2 ring-black ring-offset-2" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={image.src} alt="" fill sizes="96px" quality={75} className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
