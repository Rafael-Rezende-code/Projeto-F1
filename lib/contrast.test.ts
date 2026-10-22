import { describe, expect, it } from "vitest";
import { teams } from "@/lib/teams";
import { contrastRatio, readableTextOn } from "./contrast";

describe("contraste do texto pequeno sobre a cor da equipe", () => {
  it("calcula a razão WCAG", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#DC0000")).toBeCloseTo(5.19, 1);
  });
  it("todas as equipes ficam com ≥ 4,5:1", () => {
    for (const team of teams) expect(contrastRatio(readableTextOn(team.color), team.color)).toBeGreaterThanOrEqual(4.5);
  });
  it("McLaren (branco dá 3,05:1) usa preto; Ferrari, branco", () => {
    expect(readableTextOn("#E77400")).toBe("#000000");
    expect(readableTextOn("#DC0000")).toBe("#FFFFFF");
  });
});
