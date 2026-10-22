import { car } from "./motion";

// Relógio da entrada do carro (feat/carros A1), em funções PURAS de t (tempo linear, 0 → 1): posição, inclinação de
// velocidade, fantasma, sombra e revelação do texto saem todas daqui (testes em car-motion.test.ts).
// components/driver-car.tsx amostra estas funções em keyframes e roda cada camada como uma animação WAAPI com o MESMO
// instante de início e a mesma duração: um só relógio, executado pelo compositor (sem depender da thread principal,
// que nesse momento ainda está desenhando a assinatura e hidratando a página).

/** cubic-bezier(x1, y1, x2, y2) → função de t (Newton + bisseção), igual à curva do CSS. */
export function cubicBezierFn(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(s) - x;
      if (Math.abs(dx) < 1e-6) return sampleY(s);
      const d = slopeX(s);
      if (Math.abs(d) < 1e-6) break;
      s -= dx / d;
    }
    let lo = 0, hi = 1;
    s = x;
    while (hi - lo > 1e-6) {
      if (sampleX(s) < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return sampleY(s);
  };
}

const ease = cubicBezierFn(...car.ease);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const f = (value: number, digits = 3) => Number(value.toFixed(digits));

export type CarClockOptions = {
  /** 1: aponta (e anda) para a direita; -1: para a esquerda */
  dir: 1 | -1;
  /** largura do carro em fração da largura do slot (o slot é 5:1): (largura/altura do PNG) / 5 */
  carWidth: number;
};

/** Estado de cada camada no instante t (0 → 1). */
export function carClock(t: number, { dir, carWidth }: CarClockOptions) {
  const e = ease(clamp01(t));
  const frontAtRest = 0.5 + carWidth / 2;
  return {
    eased: e,
    /** posição (fração da largura do carro) e skew de velocidade (graus) */
    x: -dir * car.startOffset * (1 - e),
    skew: -dir * car.skew * (1 - ease(clamp01(t / car.skewUntil))),
    /** fantasma: atraso (fração da largura do carro) e opacidade; converge até car.ghostUntil e some */
    ghostX: -dir * car.ghostLag * (1 - clamp01(t / car.ghostUntil)),
    ghostOpacity: t >= car.ghostUntil ? 0 : car.ghostOpacity * (1 - clamp01((t - car.ghostUntil * 0.6) / (car.ghostUntil * 0.4))),
    /** sombra: mesma curva da posição */
    shadowScale: car.shadowFrom.scaleX + (1 - car.shadowFrom.scaleX) * e,
    shadowOpacity: car.shadowFrom.opacity + (1 - car.shadowFrom.opacity) * e,
    /** revelação do texto: borda dianteira do carro no slot (desktop) e de cima para baixo (celular), 0 → 1 */
    revealX: clamp01(frontAtRest - car.startOffset * (1 - e) * carWidth + (1 - frontAtRest) * e),
    revealY: e,
  };
}

export const carTransforms = {
  move: (s: ReturnType<typeof carClock>) => `translate3d(${f(s.x * 100)}%, 0, 0) skewX(${f(s.skew)}deg)`,
  ghost: (s: ReturnType<typeof carClock>) => `translate3d(${f(s.ghostX * 100)}%, 0, 0)`,
  shadow: (s: ReturnType<typeof carClock>) => `scaleX(${f(s.shadowScale, 4)})`,
  /** painel que cobre o texto: desliza com a borda dianteira (desktop) ou para baixo (celular) */
  coverX: (s: ReturnType<typeof carClock>, dir: 1 | -1) =>
    dir === 1 ? `translate3d(calc(${f(s.revealX * 100)}% - ${car.revealEdge}px), 0, 0)` : `translate3d(calc(${f(-s.revealX * 100)}% + ${car.revealEdge}px), 0, 0)`,
  coverY: (s: ReturnType<typeof carClock>) => `translate3d(0, calc(${f(s.revealY * 100)}% - ${car.revealEdge}px), 0)`,
};

/** Keyframes WAAPI de cada camada, amostrados do relógio em `samples` pontos (interpolação linear entre eles). */
export function carKeyframes(options: CarClockOptions, samples = 61) {
  const states = Array.from({ length: samples }, (_, i) => carClock(i / (samples - 1), options));
  return {
    move: states.map((s) => ({ transform: carTransforms.move(s) })),
    ghost: states.map((s) => ({ transform: carTransforms.ghost(s), opacity: f(s.ghostOpacity, 4) })),
    shadow: states.map((s) => ({ transform: carTransforms.shadow(s), opacity: f(s.shadowOpacity, 4) })),
    coverX: states.map((s) => ({ transform: carTransforms.coverX(s, options.dir) })),
    coverY: states.map((s) => ({ transform: carTransforms.coverY(s) })),
  };
}
