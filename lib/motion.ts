// TOKENS DE MOVIMENTO — a única escala de animação do site (rodada 2). Espelho em CSS no app/globals.css
// (--motion-short/medium/long, --ease-out/--ease-in-out, --motion-stagger, --motion-rise): mantenha os dois iguais.
//
// Regras:
// - animar só transform e opacity (nada de filter/blur, width/height, top/left, cor em loop);
// - texto nunca fica invisível por mais de ~400 ms: o que já está na tela ao carregar não anima (o HTML do servidor
//   aparece pronto); o que entra depois aparece com atraso máximo de STAGGER_CAP itens;
// - curva padrão: `out` (entradas, hover, painéis). `inOut` só para cortinas/varreduras (assinatura, troca de estado).
// - Decisão de produto (CLAUDE.md): animações ligadas mesmo com prefers-reduced-motion, mas sem deslocamento: com
//   reduced motion as entradas viram só opacidade, e o destaque laranja, a assinatura e o GlyphPortal ficam estáticos.

export const duration = {
  /** micro-interações: hover, toque, troca de cor, foco */
  short: 0.2,
  /** entradas de texto e de elementos pequenos; painéis (gaveta, menu, busca) */
  medium: 0.45,
  /** entradas de cards e blocos; zoom de imagem no hover; cortinas */
  long: 0.8,
} as const;

/** Curvas cubic-bezier (formato do motion). */
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

/** Intervalo entre itens de uma sequência (palavras, cards), em segundos. */
export const stagger = 0.05;
/** Índice máximo para o atraso: o 9º item em diante entra junto (texto longo não fica esperando). */
export const STAGGER_CAP = 8;

export const distance = {
  /** subida curta das entradas (px) */
  rise: 16,
  /** elevação no hover / item ativo (px) */
  lift: 4,
} as const;

/** Quanto do elemento precisa aparecer para disparar a entrada (IntersectionObserver). */
export const viewport = { margin: "0px 0px -8% 0px" } as const;
