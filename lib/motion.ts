// TOKENS DE MOVIMENTO — a única escala de animação do site (rodada 2). Espelho em CSS no app/globals.css
// (--motion-short/medium/long/reveal, --ease-out/--ease-in-out, --motion-stagger, --motion-rise): mantenha os dois iguais.
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
  /** revelação das fotos (cortina + foco da foto de piloto, components/motion/image-reveal.tsx) */
  reveal: 1,
} as const;

/** Miniatura que voa até a sacola ao adicionar (operação, fase 6; lib/fly-to-cart.ts). Sempre ligada. */
export const flyToCart = {
  duration: 0.6,
  /** altura do arco, em fração da distância (sobe antes de descer na sacola) */
  arc: 0.18,
  /** pulso do contador quando a miniatura chega */
  pulse: 0.35,
  size: 64,
} as const;

/** Curvas cubic-bezier (formato do motion). */
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

/**
 * Coreografia do topo da página do piloto: foto (sinal) → assinatura `signatureStart` s depois → carro `car.afterSignature`
 * s depois do INÍCIO da assinatura (sinal disparado por components/driver-signature.tsx).
 */
export const choreography = {
  signatureStart: 0.45,
  signatureEnd: 2.95,
  /** bloco de abertura (sem carro), em segundos depois do sinal da foto */
  introStart: 2.1,
} as const;

/**
 * Entrada do carro (components/driver-car.tsx), feat/carros A1. UM relógio linear de 0 a 1 (`duration` s) comanda tudo:
 * posição (curva `ease`), inclinação de entrada (skewX), fantasma, sombra e a revelação do texto. Só transform e opacity.
 */
export const car = {
  /** segundos depois do início do desenho da assinatura */
  afterSignature: 0.35,
  /** duração total da entrada, em segundos */
  duration: 1.5,
  /** ease-out quint: chega rápido e assenta sem ultrapassar (sem overshoot) */
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** onde o carro começa: fração da própria largura, para trás (fora do slot) */
  startOffset: 1.25,
  /** inclinação de velocidade no início (graus), zera em `skewUntil` do relógio */
  skew: 6,
  skewUntil: 0.7,
  /** fantasma: atraso inicial (fração da largura do carro), opacidade, desfoque ESTÁTICO (px) e até quando converge */
  ghostLag: 0.16,
  ghostOpacity: 0.3,
  ghostBlur: 6,
  ghostUntil: 0.6,
  /** sombra no chão: escala horizontal e opacidade iniciais */
  shadowFrom: { scaleX: 0.45, opacity: 0.15 },
  /** borda suave da revelação do texto (px) */
  revealEdge: 24,
  /** inclinação 3D com o mouse depois de assentar: máximo (graus) e rampa de entrada (s) */
  tiltMax: 6,
  tiltRamp: 0.5,
} as const;

/**
 * MAPA DE HOVERS por tipo de card (refino 3, item 4.1). Um comportamento por tipo, sem duas animações brigando no mesmo
 * card; só onde há hover de verdade (@media (hover: hover)); classes em app/globals.css. Documentado também no CLAUDE.md.
 */
export const hover = {
  /** Card de produto (components/product-card.tsx): 2ª foto em fade e zoom da foto; chips de tamanho sobem (distance.lift). */
  product: { photoZoom: 1.05, photoDuration: duration.long, chipsDuration: duration.medium },
  /** Coleção/categoria (components/collection-card.tsx): .hover-zoom (1,04) e .hover-arrow (seta desliza 4px na diagonal). */
  collection: { photoZoom: 1.04, photoDuration: duration.long, arrowShift: 4, arrowDuration: duration.medium },
  /** Equipe (components/team-card.tsx): TiltCard no desktop (8°, escala 1,03); o hover escurece a cor por opacidade. */
  team: { tilt: 8, scale: 1.03 },
  /** Piloto (components/drivers-section.tsx): HoverTransition (efeito próprio de cada piloto, lib/drivers.ts). */
  driver: { effect: "HoverTransition" },
  /** Artigo do Diário (components/article-card.tsx): véu escuro que se abre (.hover-veil) e sublinhado que cresce (.hover-underline). */
  article: { veilDuration: duration.long, underlineDuration: duration.medium },
} as const;

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
