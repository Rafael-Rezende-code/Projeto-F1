"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useCue } from "@/components/motion/cue";

type Props = {
  src: string;
  width: number;
  height: number;
  /** Rastro de movimento pequeno (scripts/carros/padronizar.mjs): vira o "motion blur falso" da entrada. */
  ghost?: string;
  /** Rastro leve (o intermediário entre o rastro forte e a imagem nítida). */
  ghostSoft?: string;
  /** Margem extra do rastro, em fração da largura do carro (GHOST_PAD do script: 0,12). */
  ghostPad?: number;
  /** Para que lado o carro aponta NO ARQUIVO e na página (não espelha: os patrocinadores continuam legíveis). */
  facing: "left" | "right";
  /** Sinal da foto principal (components/motion/cue.ts) e atraso, em segundos, depois dele. */
  cue: string;
  delay: number;
  blur?: string;
  sizes: string;
};

const MAX_TILT = 6; // graus

// Carro no topo da página do piloto. Coreografia: foto → assinatura → carro (começa `delay` s depois do sinal da foto,
// quando o nome já está quase todo escrito) e só quando o slot está na tela (no celular ele fica abaixo da foto).
//
// A página renderiza o slot duas vezes (um por layout: desktop e celular); o que está com display:none não monta imagem
// nenhuma porque as imagens são lazy (não eager).
//
// Entrada (CSS em app/globals.css, .driver-car): o carro chega pela lateral, de fora do slot, andando para a frente
// (de onde ele entra vem de `facing`), com ease-out forte, ~1,25 s e um pequeno assentamento no fim (passa 7 px da
// posição final e volta). O desfoque de movimento é falso: um rastro forte pré-gerado cobre o carro enquanto ele corre,
// passa para um rastro leve enquanto desacelera e a imagem nítida aparece por baixo no último terço. A sombra no chão cresce e escurece conforme ele chega. Só
// transform e opacity animam; o slot corta o que está fora dele (overflow-x: clip), então nada gera scroll horizontal.
// Depois de parado (`done`), no desktop com mouse, inclina até ~6° seguindo o ponteiro (perspective + rotateX/rotateY
// escritos direto no estilo dentro do requestAnimationFrame, sem setState). No toque: mesma entrada, sem inclinação.
// Reduced motion: só opacidade (sem deslocamento, sem rastro, sem inclinação).
export function DriverCar({ src, width, height, ghost, ghostSoft, ghostPad = 0.12, facing, cue, delay, blur, sizes }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const cueReady = useCue(cue, 4000);
  const reduced = useReducedMotion();
  const [timeReady, setTimeReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const go = timeReady && visible;
  const state = done ? "done" : go ? "in" : "pending";

  // 1) a coreografia: sinal da foto + atraso
  useEffect(() => {
    if (!cueReady) return;
    const timer = window.setTimeout(() => setTimeReady(true), (reduced ? 0.2 : delay) * 1000);
    return () => window.clearTimeout(timer);
  }, [cueReady, delay, reduced]);

  // 2) o slot precisa estar na tela (celular: abaixo da foto)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 3) inclinação seguindo o mouse: só depois que o carro parou
  useEffect(() => {
    const tilt = tiltRef.current;
    if (!tilt || !done || reduced) return;
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
  }, [done, reduced]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-state={state}
      data-facing={facing}
      className="driver-car"
      onAnimationEnd={(event) => {
        if (event.animationName === "car-drive") setDone(true);
      }}
      style={{ "--car-ratio": `${width} / ${height}`, "--ghost-pad": ghostPad } as React.CSSProperties}
    >
      <div className="driver-car__move">
        <span className="driver-car__shadow" />
        <div ref={tiltRef} className="driver-car__tilt">
          <div className="driver-car__sharp">
            <Image
              src={src}
              alt=""
              fill
              sizes={sizes}
              quality={90}
              className="object-contain"
              {...(blur ? { placeholder: "blur" as const, blurDataURL: blur } : {})}
            />
          </div>
          {/* rastros: WebP de 640px, sem otimização */}
          {ghost && (
            <div className="driver-car__ghost">
              <Image src={ghost} alt="" fill unoptimized sizes="720px" className="object-fill" />
            </div>
          )}
          {ghostSoft && (
            <div className="driver-car__ghost-soft">
              <Image src={ghostSoft} alt="" fill unoptimized sizes="720px" className="object-fill" />
            </div>
          )}
        </div>
      </div>
      <noscript>
        <style>{".driver-car__move,.driver-car__sharp,.driver-car__shadow{opacity:1!important;transform:none!important;animation:none!important}.driver-car__ghost,.driver-car__ghost-soft{display:none}"}</style>
      </noscript>
    </div>
  );
}
