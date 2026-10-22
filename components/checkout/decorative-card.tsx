"use client";

import { BRAND } from "@/lib/brand";
import { TiltOnHover } from "@/components/motion/tilt-on-hover";
import type { CardDisplay } from "@/lib/payments/types";

// Cartão DECORATIVO da etapa de pagamento: marca da loja e nome do titular (do passo de contato).
// Nunca exibe nem recebe número, validade ou CVV digitados no nosso formulário (PCI): esses dados só existem no
// componente do provedor. Quando o provedor informar bandeira e últimos 4 dígitos (CardDisplay), eles aparecem aqui;
// no modo simulado, os dígitos ficam todos mascarados.
// `simulated`: mostra o selo "Simulado" (modo sem provedor). Com o Mercado Pago, bandeira (pelo BIN, via SDK) e últimos
// 4 dígitos (devolvidos pelo Brick no envio) vêm em `display`.
export function DecorativeCard({ holder, display, simulated = true }: { holder: string; display?: CardDisplay; simulated?: boolean }) {
  const last4 = display?.last4 && /^\d{4}$/.test(display.last4) ? display.last4 : "••••";
  const name = holder.trim().toUpperCase() || "NOME DO TITULAR";
  return (
    <TiltOnHover className="mx-auto w-full max-w-[340px] rounded-2xl">
      <div
        role="img"
        aria-label={`Cartão ilustrativo em nome de ${holder.trim() || "titular"}${display?.last4 ? `, final ${last4}` : ""}. Os dados do cartão são pedidos pelo provedor de pagamento.`}
        className="relative aspect-[1.586] overflow-hidden rounded-2xl p-5 text-white shadow-xl [background:radial-gradient(circle_at_85%_15%,rgba(232,112,42,.55),transparent_45%),linear-gradient(135deg,#1a1a1a_0%,#0b0b0b_55%,#b94f01_140%)]"
      >
        <div className="flex items-start justify-between">
          <span className="font-playfair text-2xl italic tracking-[-0.07em]">
            {BRAND.name}<span className="text-[#e8702a]">{BRAND.mark}</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{display?.brand ?? "Cartão"}</span>
        </div>
        <div aria-hidden="true" className="mt-5 h-7 w-10 rounded-md bg-gradient-to-br from-[#e9d3a0] to-[#b8955a]" />
        <p aria-hidden="true" className="mt-4 font-mono text-lg tracking-[0.18em] text-white/90">
          •••• •••• •••• {last4}
        </p>
        <div aria-hidden="true" className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-4">
          <span className="min-w-0 truncate text-xs font-medium tracking-[0.12em]">{name}</span>
          {simulated && <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-white/70">Simulado</span>}
        </div>
      </div>
    </TiltOnHover>
  );
}
