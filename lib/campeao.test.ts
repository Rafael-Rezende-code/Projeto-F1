import { describe, expect, it } from "vitest";
import { CAMPEAO_CHAPTERS, CAMPEAO_NUMBERS, COROACAO, campeaoDestaqueAtivo, coroacaoFrame } from "./campeao";
import { championProducts } from "./campeao-products";
import type { Product } from "./catalog/types";

describe("Coroação: linha do tempo (valores do protótipo)", () => {
  it("p = 0: nada digitado, Kimi invisível, coroa no alto, dica visível", () => {
    const f = coroacaoFrame(0);
    expect(f).toMatchObject({ typed: "", kimiOpacity: 0, crownY: -150, crownRotate: -3, seated: false, seal: false, hint: true });
    expect(f.crownScale).toBeCloseTo(1.06);
    expect(f.kimiY).toBeCloseTo(2.2);
  });
  it("digita THE CHAMPI até p = 0,10 e revela Kimi entre 0,03 e 0,12", () => {
    expect(coroacaoFrame(0.05).typed).toBe("THE C");
    expect(coroacaoFrame(0.1).typed).toBe(COROACAO.typed);
    expect(coroacaoFrame(0.075).kimiOpacity).toBeCloseTo(0.5);
    expect(coroacaoFrame(0.12).kimiOpacity).toBe(1);
    expect(coroacaoFrame(0.06).hint).toBe(false);
  });
  it("a coroa desce entre 0,14 e 0,58 com easeInOutCubic; sombra cresce com d³", () => {
    expect(coroacaoFrame(0.14).crownY).toBeCloseTo(-150);
    const mid = coroacaoFrame(0.36); // t = 0,5 → d = 0,5
    expect(mid.crownY).toBeCloseTo(-75);
    expect(mid.shadowOpacity).toBeCloseTo(0.125);
    expect(mid.shadowScale).toBeCloseTo(0.875);
    const end = coroacaoFrame(0.58);
    expect(end.crownY).toBeCloseTo(0);
    expect(end.crownRotate).toBeCloseTo(0);
    expect(end.crownScale).toBeCloseTo(1);
  });
  it("encaixe em p ≥ 0,58 e selo em p ≥ 0,72, reversíveis", () => {
    expect(coroacaoFrame(0.579).seated).toBe(false);
    expect(coroacaoFrame(0.58).seated).toBe(true);
    expect(coroacaoFrame(0.719).seal).toBe(false);
    expect(coroacaoFrame(0.72).seal).toBe(true);
    expect(coroacaoFrame(0.3)).toMatchObject({ seated: false, seal: false });
  });
});

describe("destaque da home", () => {
  it("vale até CAMPEAO_DESTAQUE_ATE inclusive, pelo dia de São Paulo", () => {
    expect(campeaoDestaqueAtivo(Date.parse("2026-12-31T23:30:00-03:00"), "2026-12-31")).toBe(true);
    // 01/01 00:30 em São Paulo (03:30 UTC): já acabou.
    expect(campeaoDestaqueAtivo(Date.parse("2027-01-01T00:30:00-03:00"), "2026-12-31")).toBe(false);
    // 31/12 23:30 em São Paulo ainda é 01/01 em UTC: continua valendo.
    expect(campeaoDestaqueAtivo(Date.parse("2027-01-01T02:30:00Z"), "2026-12-31")).toBe(true);
  });
});

describe("dados da sessão", () => {
  it("no máximo 3 números e os capítulos na ordem pedida (coroação, bandeira, coleção)", () => {
    expect(CAMPEAO_NUMBERS.length).toBeLessThanOrEqual(3);
    expect(CAMPEAO_CHAPTERS.map((chapter) => chapter.kind)).toEqual(["coroacao", "bandeira", "colecao"]);
    expect(CAMPEAO_CHAPTERS.find((chapter) => chapter.kind === "colecao")?.id).toBe("colecao");
  });
  it("produtos do campeão: tag antonelli ou piloto antonelli", () => {
    const make = (slug: string, extra: Partial<Product>) => ({ slug, tags: [], ...extra }) as unknown as Product;
    const list = [make("a", { tags: ["antonelli", "camiseta"] }), make("b", { driverSlug: "antonelli" }), make("c", { tags: ["mercedes"] })];
    expect(championProducts(list).map((product) => product.slug)).toEqual(["a", "b"]);
  });
});

describe("piloto campeão só no código", () => {
  it("fora do seed do banco e sem produtos de exemplo; primeiro na lista do catálogo", async () => {
    const { seedData, SeedCatalogRepository } = await import("./catalog/seed-repository");
    expect(seedData.drivers.some((driver) => driver.slug === "antonelli")).toBe(false);
    expect(seedData.products.some((product) => product.driverSlug === "antonelli" || product.tags.includes("antonelli"))).toBe(false);
    const drivers = await new SeedCatalogRepository().getDrivers();
    expect(drivers[0]).toMatchObject({ slug: "antonelli", teamSlug: "mercedes" });
  });
});
