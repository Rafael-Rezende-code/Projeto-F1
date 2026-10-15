// TOKENS DE MOVIMENTO — durações (s), curvas e distâncias usadas pelas animações do site daqui em diante.
// Os mesmos valores existem como variáveis CSS em app/globals.css (--motion-*, --ease-*) para transições em CSS.
// Decisão de produto (CLAUDE.md): animações sempre ligadas, mesmo com prefers-reduced-motion; a única exceção é o
// GlyphPortal (move a tela inteira com o scroll).

export const duration = {
  /** micro-interações: hover, toque, troca de cor */
  fast: 0.2,
  /** entradas de elementos pequenos, chips, botões */
  base: 0.45,
  /** entradas de blocos e cards ao rolar */
  reveal: 0.7,
  /** painéis grandes (gaveta, menu, busca) */
  panel: 0.5,
  /** cortinas e transições de página */
  slow: 0.9,
} as const;

/** Curvas cubic-bezier (formato do motion) */
export const ease = {
  /** saída rápida e longa desaceleração: padrão para entradas */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** entrada e saída suaves: cortinas, trocas de estado */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  /** padrão de interface (Material standard) */
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
};

export const distance = {
  /** subida curta das entradas (px) */
  rise: 16,
  /** elevação do item ativo / logo no hover (px) */
  lift: 4,
  /** desfoque inicial das entradas de texto (px) */
  blur: 10,
} as const;

export const stagger = {
  /** entre cards de uma grade */
  cards: 0.07,
  /** entre palavras de um parágrafo */
  words: 0.035,
  /** entre letras de um título (BlurReveal: 0.03 / speedReveal) */
  letters: 0.018,
} as const;

/** Quanto do elemento precisa aparecer para disparar a entrada (IntersectionObserver / whileInView). */
export const viewport = { amount: 0.25, margin: "0px 0px -8% 0px" } as const;

/** Mola para elementos que seguem o ponteiro ou o dedo. */
export const spring = { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.6 };
