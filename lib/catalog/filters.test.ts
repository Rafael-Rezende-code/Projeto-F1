import { describe, expect, it } from "vitest";
import { catalogHref, countFacets, facetOf, firstPages, mostRestrictiveFacet, onlyPage, PAGE_SIZE, parseCatalogParams, sizeOptions, toProductFilters, type CatalogParams } from "./filters";
import { SeedCatalogRepository } from "./seed-repository";
import { products } from "./seed/products";

const repo = new SeedCatalogRepository();
const items = products.map(facetOf);
const params = (extra: Record<string, string>) => parseCatalogParams(extra);

describe("catálogo: filtros na URL", () => {
  it("lê e limpa os parâmetros (valores desconhecidos somem; página só de 2 a 100)", () => {
    const parsed = parseCatalogParams({ categoria: "teamwear", tamanho: "M", entrega: "pronta", disponivel: "1", preco: "xx", ordem: "?", pagina: "3" });
    expect(parsed).toMatchObject({ categoria: "teamwear", tamanho: "M", entrega: "pronta", disponivel: "1", preco: undefined, ordem: "relevancia", pagina: "3" });
    expect(parseCatalogParams({ pagina: "1" }).pagina).toBeUndefined();
    expect(parseCatalogParams({ pagina: "0" }).pagina).toBeUndefined();
    expect(parseCatalogParams({ disponivel: "sim" }).disponivel).toBeUndefined();
  });

  it("mudar um filtro volta para a página 1; trocar a página mantém os filtros", () => {
    const current = params({ categoria: "teamwear", pagina: "2" });
    expect(catalogHref(current, { tamanho: "M" })).toBe("/produtos?categoria=teamwear&tamanho=M");
    expect(catalogHref(current, { pagina: "3" })).toBe("/produtos?categoria=teamwear&pagina=3");
    expect(catalogHref(params({}))).toBe("/produtos");
  });
});

describe("catálogo: mesma regra no servidor e no navegador", () => {
  const cases: Record<string, string>[] = [
    { tamanho: "M" },
    { tamanho: "M", disponivel: "1" },
    { entrega: "encomenda" },
    { entrega: "pronta", categoria: "acessorios" },
    { disponivel: "1", preco: "ate-200" },
    { equipe: "ferrari", tamanho: "GG" },
  ];
  for (const values of cases) {
    it(`contagem do navegador = resultado do repositório: ${JSON.stringify(values)}`, async () => {
      const parsed = params(values);
      expect(countFacets(items, parsed)).toBe((await repo.getProducts(toProductFilters(parsed))).length);
    });
  }

  it("tamanho com 'só com estoque' exige estoque naquele tamanho", async () => {
    const all = await repo.getProducts(toProductFilters(params({ tamanho: "G" })));
    const withStock = await repo.getProducts(toProductFilters(params({ tamanho: "G", disponivel: "1" })));
    expect(withStock.length).toBeLessThan(all.length);
    expect(withStock.every((product) => product.variants.some((variant) => variant.size === "G" && variant.stock > 0))).toBe(true);
  });

  it("tamanhos na ordem de roupa e depois os outros", () => {
    expect(sizeOptions(items)).toEqual(["P", "M", "G", "GG", "Único"]);
  });
});

describe("catálogo: estado vazio e páginas", () => {
  it("sugere remover o filtro que, sozinho, devolve mais produtos", () => {
    const parsed: CatalogParams = { ...params({ equipe: "haas", categoria: "colecionaveis" }) };
    expect(countFacets(items, parsed)).toBe(0);
    const best = mostRestrictiveFacet(items, parsed);
    expect(best?.key).toBe("equipe"); // sem a equipe sobram todos os colecionáveis; sem a categoria, só 4 da Haas
    expect(best?.count).toBeGreaterThan(0);
  });

  it("?pagina=N mostra as N primeiras páginas; 'Carregar mais' pede só a fatia seguinte", () => {
    const list = Array.from({ length: 30 }, (_, index) => index);
    expect(firstPages(list, 2)).toHaveLength(PAGE_SIZE * 2);
    expect(onlyPage(list, 3)).toEqual(list.slice(24, 30));
    expect(onlyPage(list, 4)).toEqual([]);
  });
});
