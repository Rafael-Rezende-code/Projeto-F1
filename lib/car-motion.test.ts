import { describe, expect, it } from "vitest";
import { carClock, carKeyframes, cubicBezierFn } from "./car-motion";
import { car } from "./motion";

const options = { dir: 1 as const, carWidth: 0.9 };

describe("relógio do carro", () => {
  it("curva igual ao cubic-bezier do CSS (ease-out quint), sem passar de 1", () => {
    const ease = cubicBezierFn(...car.ease);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeGreaterThan(0.9);
    let last = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = ease(t);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
      last = v;
    }
  });

  it("começa fora do slot, do lado de trás, e termina parado sem skew; sombra na mesma curva", () => {
    const start = carClock(0, options);
    const end = carClock(1, options);
    expect(start.x).toBe(-car.startOffset);
    expect(start.skew).toBe(-car.skew);
    expect(end.x === 0 || Object.is(end.x, -0)).toBe(true);
    expect(Math.abs(end.skew)).toBe(0);
    expect(carClock(0, { ...options, dir: -1 }).x).toBe(car.startOffset);
    expect(end.shadowScale).toBe(1);
    expect(carClock(0.5, options).shadowOpacity).toBeCloseTo(car.shadowFrom.opacity + (1 - car.shadowFrom.opacity) * carClock(0.5, options).eased);
  });

  it("fantasma converge e some até ghostUntil", () => {
    expect(carClock(0, options).ghostOpacity).toBeCloseTo(car.ghostOpacity);
    expect(carClock(car.ghostUntil, options).ghostOpacity).toBe(0);
    expect(Math.abs(carClock(car.ghostUntil, options).ghostX)).toBe(0);
    expect(carClock(0.9, options).ghostOpacity).toBe(0);
  });

  it("texto: não aparece antes do carro chegar e termina 100% revelado", () => {
    expect(carClock(0, options).revealX).toBe(0);
    expect(carClock(0, options).revealY).toBe(0);
    expect(carClock(1, options).revealX).toBe(1);
    // a revelação nunca passa da borda dianteira do carro (com folga da parte que falta até o fim do slot)
    for (let t = 0; t <= 1; t += 0.05) {
      const s = carClock(t, options);
      const front = 0.5 + options.carWidth / 2 + s.x * options.carWidth;
      expect(s.revealX).toBeLessThanOrEqual(Math.max(0, front) + (1 - (0.5 + options.carWidth / 2)) + 1e-9);
    }
  });

  it("keyframes: todas as camadas com o mesmo número de amostras", () => {
    const frames = carKeyframes(options, 41);
    for (const layer of Object.values(frames)) expect(layer).toHaveLength(41);
    expect(frames.move[0].transform).toBe("translate3d(-125%, 0, 0) skewX(-6deg)");
    expect(frames.move[40].transform).toMatch(/^translate3d\(-?0%, 0, 0\) skewX\(-?0deg\)$/);
  });
});
