"use client";

import dynamic from "next/dynamic";
import type { GlyphPortalStyle } from "@/components/ui/glyph-portal";

// Seção "VELOCIDADE" antes de "Luzes apagadas": a câmera entra numa letra e o vermelho toma a tela.
// ssr: false → o GlyphPortal só monta no cliente (o id do useId divergia entre servidor e cliente no v0).
// O placeholder reserva a altura do primeiro quadro (100svh) com o mesmo fundo, sem salto de layout.
// Reduced motion: o próprio componente fica estático e mostra o conteúdo direto (exceção registrada no CLAUDE.md).
// Nenhum ancestral pode ter overflow hidden/auto, transform ou filter: quebraria o position: sticky.
// O seletor "Escolha uma letra" (telas de toque) fica escondido por CSS (.velocidade-portal no globals.css), sem mexer
// no componente: a letra de entrada é a que ele escolhe sozinho (a de maior área de tinta).
const GlyphPortal = dynamic(() => import("@/components/ui/glyph-portal"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-svh bg-[#f5f5f3]" />,
});

// Papel e tinta iguais à seção anterior ("O que o grid veste": fundo #f5f5f3, texto preto).
const portalStyle: GlyphPortalStyle = {
  "--gp-paper": "#f5f5f3",
  "--gp-ink": "#000000",
  "--gp-field": "#c8102e",
  "--gp-foreground": "#ffffff",
};

const field = (
  <div
    style={{
      position: "absolute",
      inset: 0,
      transform: "scale(var(--gp-field-scale,1))",
      background:
        "radial-gradient(circle at 18% 10%, rgba(255,120,90,.45), transparent 36%), radial-gradient(circle at 84% 22%, rgba(255,255,255,.10), transparent 28%), radial-gradient(circle at 50% 82%, rgba(90,0,16,.55), transparent 46%), linear-gradient(135deg,#a50d26 0%,#c8102e 48%,#7d0a1c 100%)",
    }}
  />
);

export function VelocidadePortal() {
  return (
    <GlyphPortal word="VELOCIDADE" enterLabel="Entrar" scrollLength={2.2} style={portalStyle} background={field} className="velocidade-portal">
      <div>
        <h2 data-gp-default-title>Cada décimo conta.</h2>
        <p data-gp-default-copy>Peças feitas para quem sente a corrida antes mesmo da largada.</p>
        <a
          href="#collection"
          className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-xs font-medium text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Ver a coleção <span aria-hidden="true">→</span>
        </a>
      </div>
    </GlyphPortal>
  );
}
