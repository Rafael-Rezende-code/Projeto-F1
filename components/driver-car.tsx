"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useCue } from "@/components/motion/cue";

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Espelha o arquivo (scaleX(-1)) quando o carro aponta para o lado oposto ao desejado (lib/drivers.ts). */
  mirror: boolean;
  /** De que lado ele entra: o carro "chega" andando para a frente. */
  from: "left" | "right";
  cue: string;
  delay: number;
  blur?: string;
  sizes: string;
};

const MAX_TILT = 6; // graus

// Carro no topo da página do piloto (fase 2 da rodada de conteúdo). Entra deslizando de lado `delay` s depois do sinal
// da foto (depois da assinatura), com sombra no chão em CSS (elipse em radial-gradient). No desktop com mouse, inclina
// até ~6° seguindo o ponteiro (perspective + rotateX/rotateY escritos direto no estilo dentro do requestAnimationFrame,
// sem setState). No toque e com reduced motion: sem inclinação; com reduced motion a entrada é só opacidade.
export function DriverCar({ src, width, height, alt, mirror, from, cue, delay, blur, sizes }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const ready = useCue(cue, 4000);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    const timer = window.setTimeout(() => (el.dataset.state = "in"), (reduced ? 0.3 : delay) * 1000);
    return () => window.clearTimeout(timer);
  }, [ready, delay, reduced]);

  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt || reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      tilt.style.transform = `rotateY(${(x * MAX_TILT).toFixed(2)}deg) rotateX(${(-y * MAX_TILT * 0.6).toFixed(2)}deg)`;
    };
    const onMove = (event: PointerEvent) => {
      const box = tilt.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      // -1..1 a partir do centro do carro, limitado a uma área do tamanho da tela
      x = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)));
      y = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2)));
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div ref={ref} data-state="pending" data-from={from} className="driver-car" style={{ aspectRatio: `${width} / ${height}` }}>
      <span aria-hidden="true" className="driver-car__shadow" />
      <div ref={tiltRef} className="driver-car__tilt">
        <div className="driver-car__body" style={mirror ? { transform: "scaleX(-1)" } : undefined}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={90}
            className="object-contain"
            {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
          />
        </div>
      </div>
      <noscript>
        <style>{".driver-car{opacity:1!important}.driver-car>*{opacity:1!important;transform:none!important}"}</style>
      </noscript>
    </div>
  );
}
