import { describe, expect, it } from "vitest";
import { collections } from "@/lib/content/collections";
import { collectionsWithProducts, matchesCollection, productsInCollection, splitCollectionHighlight } from "./collections";
import { products } from "./seed/products";
import type { Product } from "./types";

const make = (extra: Partial<Product>) => ({ id: "x", slug: "x", categorySlug: "teamwear", tags: [], priceCents: 10000, ...extra }) as Product;
const bySlug = (slug: string) => collections.find((collection) => collection.slug === slug)!;

describe("coleções: regra", () => {
  it("categoria OU tag; a faixa de preço vale nas duas pontas", () => {
    const filters = { categories: ["colecionaveis"], tags: ["colecionavel"], maxPriceCents: 20000 };
    expect(matchesCollection(make({ categorySlug: "colecionaveis" }), filters)).toBe(true);
    expect(matchesCollection(make({ tags: ["colecionavel"] }), filters)).toBe(true);
    expect(matchesCollection(make({}), filters)).toBe(false);
    expect(matchesCollection(make({ categorySlug: "colecionaveis", priceCents: 20001 }), filters)).toBe(false);
    expect(matchesCollection(make({ priceCents: 5000 }), { minPriceCents: 5000 })).toBe(true);
  });

  it("destaque da landing: featured, depois mais vendido manual, depois o primeiro", () => {
    const list = [make({ id: "a" }), make({ id: "b", bestsellerManual: true }), make({ id: "c", featured: true })];
    expect(splitCollectionHighlight(list).highlight.id).toBe("c");
    expect(splitCollectionHighlight(list).rest.map((p) => p.id)).toEqual(["a", "b"]);
    expect(splitCollectionHighlight(list.slice(0, 2)).highlight.id).toBe("b");
    expect(splitCollectionHighlight([]).highlight).toBeUndefined();
  });
});

describe("coleções no seed", () => {
  it("camisetas, miniaturas, colecionáveis e acessórios têm produtos; pistas 3D e canecas ainda não (Em breve)", () => {
    const listed = collectionsWithProducts(products).map((item) => item.collection.slug);
    expect(listed).toEqual(["camisetas", "miniaturas", "colecionaveis", "acessorios"]);
    expect(productsInCollection(bySlug("miniaturas"), products).every((product) => product.slug.startsWith("miniatura-capacete-"))).toBe(true);
    expect(productsInCollection(bySlug("pistas-3d"), products)).toEqual([]);
    expect(productsInCollection(bySlug("canecas"), products)).toEqual([]);
  });

  it("slugs únicos", () => {
    expect(new Set(collections.map((collection) => collection.slug)).size).toBe(collections.length);
  });
});
