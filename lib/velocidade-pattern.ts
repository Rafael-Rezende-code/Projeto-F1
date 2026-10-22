// Padrão do campo vermelho da seção VELOCIDADE (fase 3 da rodada de conteúdo): linhas de fluxo como num túnel de
// vento / curvas de nível de circuito, geradas em código (deterministas, sem arquivo). Cada linha é uma onda suave
// desviada por dois "obstáculos" (bossas gaussianas), amostrada a cada STEP px e convertida em curvas de Bézier
// (Catmull-Rom). O SVG é maior que a tela (folga para a deriva lenta da animação sem mostrar a borda).
export const PATTERN_BOX = { x: -200, y: -150, width: 2000, height: 1300 };

const LINES = 26;
const STEP = 50;

const bump = (x: number, y: number, cx: number, cy: number, r: number, push: number) => {
  const d = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r);
  return push * Math.exp(-d) * Math.sign(y - cy || 1);
};

function smoothPath(points: [number, number][]) {
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export const PATTERN_PATHS: string[] = Array.from({ length: LINES }, (_, line) => {
  const y0 = PATTERN_BOX.y + ((line + 0.5) * PATTERN_BOX.height) / LINES;
  const points: [number, number][] = [];
  for (let x = PATTERN_BOX.x; x <= PATTERN_BOX.x + PATTERN_BOX.width; x += STEP) {
    const wave = 26 * Math.sin(x / 260 + line * 0.35) + 12 * Math.sin(x / 113 - line * 0.6);
    const y = y0 + wave + bump(x, y0, 560, 380, 300, 90) + bump(x, y0, 1250, 720, 340, 110);
    points.push([x, y]);
  }
  return smoothPath(points);
});
