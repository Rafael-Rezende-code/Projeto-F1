import { describe, expect, it } from "vitest";
import { isNewProduct, pickBestsellers, todayInStore } from "./curation";
import type { Product } from "./types";

const make = (slug: string, extra: Partial<Product> = {}) => ({ id: slug, slug, isNew: false, ...extra }) as Product;

describe("curadoria: NOVO", () => {
  it("vale is_new ou new_until até o dia (inclusive), no fuso da loja", () => {
    expect(isNewProduct({ isNew: true }, "2026-10-26")).toBe(true);
    expect(isNewProduct({ isNew: false, newUntil: "2026-10-26" }, "2026-10-26")).toBe(true);
    expect(isNewProduct({ isNew: false, newUntil: "2026-10-25" }, "2026-10-26")).toBe(false);
    expect(isNewProduct({ isNew: false }, "2026-10-26")).toBe(false);
    // 02:00 UTC do dia 27 ainda é dia 26 em São Paulo
    expect(todayInStore(new Date("2026-10-27T02:00:00Z"))).toBe("2026-10-26");
  });
});

describe("curadoria: Mais vendidos", () => {
  const catalog = [
    make("a"),
    make("b", { featured: true }),
    make("c", { bestsellerManual: true }),
    make("d", { bestsellerManual: true, bestsellerRank: 2 }),
    make("e", { bestsellerManual: true, bestsellerRank: 1 }),
    make("f"),
    make("g", { featured: true }),
    make("h"),
    make("i"),
    make("j"),
  ];
  const slugs = (list: Product[]) => list.map((product) => product.slug);

  it("manuais primeiro (por ordem; sem ordem depois), depois vendas reais, depois destaques, até 8", () => {
    expect(slugs(pickBestsellers(catalog, ["h", "e", "i", "zz"]))).toEqual(["e", "d", "c", "h", "i", "b", "g"]);
  });

  it("não repete produto e respeita o limite", () => {
    expect(slugs(pickBestsellers(catalog, ["a", "f", "h", "i", "j"], 8))).toEqual(["e", "d", "c", "a", "f", "h", "i", "j"]);
  });

  it("sem curadoria nem vendas: destaques e, abaixo do mínimo, o catálogo na ordem de relevância", () => {
    const plain = [make("a"), make("b", { featured: true }), make("c"), make("d"), make("e")];
    expect(slugs(pickBestsellers(plain))).toEqual(["b", "a", "c", "d"]);
  });

  it("nunca fica vazia com produtos ativos; catálogo vazio dá lista vazia", () => {
    expect(pickBestsellers([make("x")])).toHaveLength(1);
    expect(pickBestsellers([])).toEqual([]);
  });
});
