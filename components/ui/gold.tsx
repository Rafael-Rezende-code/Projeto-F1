import type { CSSProperties, ElementType, ReactNode } from "react";

// SISTEMA DOURADO DO CAMPEÃO (feat/antonelli-2). Reservado ao campeão: use só nas telas e cards do Kimi.
// Tokens (--ouro-sombra #5c4310, --ouro-escuro #8f6a1e, --ouro #c8962c, --ouro-claro #e8c36a, --ouro-brilho #fff3c4) e
// classes em app/globals.css ("Sistema dourado do campeão"). Serifa itálica: .font-ouro-serif (Cormorant Garamond 500,
// lib/fonts.ts). Nada aqui é desenho: só degradê, borda e uma fita de texto. Animações (feixe e brilho) só com
// transform e pausadas fora da tela: envolva o bloco em <PlayWhenVisible className="gold-anim">.

/** Texto com degradê dourado. Só sobre fundo escuro (o ouro médio dá ~7:1 sobre #0b0b0c). */
export function GoldText({ as: Tag = "span", className = "", children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <Tag className={`gold-text ${className}`}>{children}</Tag>;
}

/** Borda dourada de 1px com um feixe de luz girando. O miolo é escuro (#0b0b0c); `className` vai no contorno (tamanho,
 * grid) e `innerClassName` no miolo. `beamSize` (CSS) para formatos mais altos que 4:5. */
export function GoldBeamBorder({
  className = "",
  innerClassName = "",
  beamSize,
  children,
}: {
  className?: string;
  innerClassName?: string;
  beamSize?: string;
  children: ReactNode;
}) {
  return (
    <div className={`gold-beam ${className}`} style={beamSize ? ({ "--beam-size": beamSize } as CSSProperties) : undefined}>
      <div className={`gold-beam-miolo ${innerClassName}`}>{children}</div>
    </div>
  );
}

/** Fita dourada com as pontas recortadas ("Campeão Mundial 2026"). Texto escuro sobre o ouro (~7:1). */
export function GoldRibbon({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`gold-ribbon ${className}`}>{children}</span>;
}

/** Brilho dourado que atravessa o bloco de tempos em tempos (a cada 7 s). Decorativo. */
export function GoldSheen() {
  return (
    <span className="gold-sheen" aria-hidden="true">
      <i />
    </span>
  );
}
