"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { contrastText, type PersonalizationConfig } from "@/lib/personalization";

// Prévia das costas da camisa (loja extra, item 3): silhueta desenhada em código, na cor da equipe (lib/teams.ts), com o
// nome em arco acima do número, na Archivo. Sem imagens de camisas de terceiros. Se o produto tiver uma foto das costas
// configurada (personalization.back), o texto vai sobre ela, nas posições em porcentagem.
const SHIRT =
  "M96 22 C112 34 132 40 150 40 C168 40 188 34 204 22 L262 46 L292 112 L246 132 L234 104 L234 322 C234 328 230 332 224 332 L76 332 C70 332 66 328 66 322 L66 104 L54 132 L8 112 L38 46 Z";

export function ShirtPreview({ name, number, color, back, className = "" }: { name?: string; number?: string; color: string; back?: PersonalizationConfig["back"]; className?: string }) {
  const ink = back?.color ?? contrastText(color);
  // Corpo do nome: começa em 28 e diminui (medindo o texto) até caber no arco das costas, sem invadir as mangas.
  const nameRef = useRef<SVGTextElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const arcId = `arco-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useLayoutEffect(() => {
    const text = nameRef.current;
    const arc = arcRef.current;
    if (!text || !arc) return;
    text.setAttribute("font-size", "28");
    const room = arc.getTotalLength() * 0.94;
    const width = text.getComputedTextLength();
    if (width > room) text.setAttribute("font-size", String(Math.max(10, (28 * room) / width)));
  }, [name]);
  if (back) {
    return (
      <div className={`relative isolate overflow-hidden rounded-2xl bg-[#e9e8e4] ${className}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto da galeria do próprio produto, já otimizada no catálogo */}
        <img src={back.src} alt="" className="absolute inset-0 size-full object-cover" />
        <span className="font-display absolute inset-x-0 text-center text-[clamp(14px,6cqw,30px)] font-bold tracking-[0.08em]" style={{ top: `${back.nameTop}%`, color: ink }}>{name}</span>
        <span className="font-display absolute inset-x-0 text-center text-[clamp(48px,26cqw,120px)] font-bold leading-none" style={{ top: `${back.numberTop}%`, color: ink }}>{number}</span>
      </div>
    );
  }
  return (
    <svg viewBox="0 0 300 340" className={className} aria-hidden="true">
      <path d={SHIRT} fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinejoin="round" />
      {/* gola e costuras */}
      <path d="M112 30 C126 38 140 42 150 42 C160 42 174 38 188 30" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="3" />
      <path d="M66 104 L66 322 M234 104 L234 322" stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
      <defs>
        <path ref={arcRef} id={arcId} d="M74 118 Q150 90 226 118" />
      </defs>
      {name && (
        <text ref={nameRef} fill={ink} fontSize={28} fontWeight={700} letterSpacing="1" textAnchor="middle" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
          <textPath href={`#${arcId}`} startOffset="50%">{name}</textPath>
        </text>
      )}
      {number && (
        <text x="150" y="256" fill={ink} fontSize={number.length > 2 ? 96 : 120} fontWeight={800} textAnchor="middle" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
          {number}
        </text>
      )}
    </svg>
  );
}
