import { describe, expect, it } from "vitest";
import { getLegend, legends, legendTag } from "./index";
import { homeLegends } from "@/components/legends-home";
import type { Product } from "@/lib/catalog/types";

describe("lendas", () => {
  it("8 nomes, cada um com abertura, 2–3 parágrafos, 3–5 marcos e 3 curiosidades", () => {
    expect(legends.map((legend) => legend.slug)).toEqual(["senna", "fittipaldi", "piquet", "schumacher", "prost", "lauda", "fangio", "clark"]);
    for (const legend of legends) {
      expect(legend.opening.length).toBeGreaterThan(20);
      expect(legend.trajectory.length).toBeGreaterThanOrEqual(2);
      expect(legend.trajectory.length).toBeLessThanOrEqual(3);
      expect(legend.milestones.length).toBeGreaterThanOrEqual(3);
      expect(legend.milestones.length).toBeLessThanOrEqual(5);
      expect(legend.curiosities).toHaveLength(3);
    }
  });

  it("sem citações atribuídas nem fotos de terceiros (só Senna tem foto, a do próprio projeto)", () => {
    for (const legend of legends) {
      const text = [legend.opening, ...legend.trajectory, ...legend.curiosities].join(" ");
      expect(text).not.toMatch(/\b(disse|afirmou|declarou|segundo ele|nas palavras)\b|[“”]/i);
      if (legend.photo) expect(legend.photo.src.startsWith("/images/")).toBe(true);
    }
    expect(legends.filter((legend) => legend.photo).map((legend) => legend.slug)).toEqual(["senna"]);
  });

  it("home: só as lendas com produto (tag lenda-{slug}); sem nenhuma, as 4 primeiras", () => {
    const product = (tags: string[]) => ({ tags }) as Product;
    expect(homeLegends([]).map((legend) => legend.slug)).toEqual(["senna", "fittipaldi", "piquet", "schumacher"]);
    expect(homeLegends([product([legendTag("clark")]), product(["camiseta"])]).map((legend) => legend.slug)).toEqual(["clark"]);
    expect(getLegend("nao-existe")).toBeNull();
  });
});
