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
  it("busca vazia não devolve nada", async () => {
    expect((await repo.search("  ")).products).toEqual([]);
  });
});
