import { describe, expect, it } from "vitest";
import { SeedCatalogRepository, normalize } from "./seed-repository";

const repo = new SeedCatalogRepository();

describe("busca do catálogo", () => {
  it("normaliza acentos, maiúsculas e pontuação", () => {
    expect(normalize("Colecionáveis!")).toBe("colecionaveis");
  });
  it("acha por equipe, piloto e categoria", async () => {
    expect((await repo.search("mclaren")).teams.map((t) => t.slug)).toEqual(["mclaren"]);
    expect((await repo.search("norris")).drivers.map((d) => d.slug)).toEqual(["norris"]);
    expect((await repo.search("colecionaveis")).categories.map((c) => c.slug)).toEqual(["colecionaveis"]);
  });
  it("combina termos (todos precisam aparecer) e prioriza o nome", async () => {
    const { products } = await repo.search("bone ferrari");
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.teamSlug === "ferrari")).toBe(true);
  });
  it("filtro de texto da listagem (/produtos?q=) usa a mesma regra da busca", async () => {
    const all = await repo.getProducts({ query: "bone ferrari" });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p.teamSlug === "ferrari")).toBe(true);
    expect((await repo.search("bone ferrari")).products.every((p) => all.some((q) => q.id === p.id))).toBe(true);
    expect(await repo.getProducts({ query: "xyzw" })).toEqual([]);
  });
  it("busca vazia não devolve nada", async () => {
    expect((await repo.search("  ")).products).toEqual([]);
  });
});
