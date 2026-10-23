import { describe, expect, it } from "vitest";
import { flyKeyframes } from "./fly-to-cart";

describe("voar para a sacola", () => {
  it("sai centrada na origem, sobe em arco e termina pequena e invisível no destino", () => {
    const frames = flyKeyframes({ x: 100, y: 500 }, { x: 900, y: 40 }, 64);
    expect(frames[0]).toMatchObject({ offset: 0, opacity: 0, transform: "translate3d(68.0px, 468.0px, 0) scale(1)" });
    const last = frames[frames.length - 1];
    expect(last).toMatchObject({ offset: 1, opacity: 0, transform: "translate3d(868.0px, 8.0px, 0) scale(0.25)" });
    // no meio, acima da reta (arco)
    const mid = frames.find((frame) => frame.offset === 0.5)!;
    const y = Number(/, (-?[\d.]+)px, 0\)/.exec(String(mid.transform))![1]);
    expect(y).toBeLessThan((500 + 40) / 2 - 32);
    // só transform e opacity
    for (const frame of frames) expect(Object.keys(frame).sort()).toEqual(["offset", "opacity", "transform"]);
  });
});
