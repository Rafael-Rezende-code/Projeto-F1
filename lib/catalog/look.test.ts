import { describe, expect, it } from "vitest";
import { completeTheLook, pushRecent } from "./look";
import { products } from "./seed/products";

const bySlug = (slug: string) => products.find((product) => product.slug === slug)!;

describe("Complete o look", () => {
  it("só outras categorias, 3 a 4 itens, preferindo o mesmo piloto e depois a mesma equipe", () => {
    const tee = bySlug("camiseta-hamilton"); // racing, Ferrari, Hamilton
    const look = completeTheLook(tee, products);
    expect(look.length).toBeGreaterThanOrEqual(3);
    expect(look.length).toBeLessThanOrEqual(4);
    expect(look.every((item) => item.categorySlug !== tee.categorySlug)).toBe(true);
    expect(look[0].driverSlug).toBe("hamilton");
    expect(look.filter((item) => item.driverSlug === "hamilton" || item.teamSlug === "ferrari").length).toBe(look.length);
  });

  it("varia as categorias antes de repetir", () => {
    const look = completeTheLook(bySlug("camiseta-ferrari-2026"), products);
    expect(new Set(look.slice(0, 3).map((item) => item.categorySlug)).size).toBe(3);
  });

  it("produto sem equipe nem piloto ainda recebe sugestões de outras categorias", () => {
    const tote = bySlug("apex-circuit-tote");
    const look = completeTheLook(tote, products);
    expect(look.length).toBe(4);
    expect(look.some((item) => item.categorySlug === tote.categorySlug)).toBe(false);
  });
});

describe("Vistos recentemente", () => {
  it("o atual vai para o começo, sem repetir, até o máximo", () => {
    expect(pushRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    expect(pushRecent(["a", "b", "c", "d", "e", "f", "g"], "h")).toEqual(["h", "a", "b", "c", "d", "e", "f"]);
  });
});
