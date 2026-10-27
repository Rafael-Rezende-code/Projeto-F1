import { describe, expect, it } from "vitest";
import { dropForProduct, dropIssueMessage, dropIssues, isReleased, launchLabel, visibleDrops, type Drop } from "./drops";

// Drops de TESTE (não são lançamentos reais).
const drop = (slug: string, launchAt: string, extra: Partial<Drop> = {}): Drop => ({ id: slug, slug, title: `Drop ${slug}`, description: "", launchAt, mode: "lancamento", productSlugs: [], active: true, ...extra });
const at = (iso: string) => new Date(iso).getTime();

describe("drops", () => {
  // Lançamento sexta 20:00 em Brasília = 23:00 UTC.
  const a = drop("a", "2030-11-15T23:00:00Z", { productSlugs: ["camiseta-x", "bone-x"], perOrderLimit: 2 });
  const b = drop("b", "2030-12-01T13:00:00Z", { productSlugs: ["poster-y"], mode: "pre_venda", shipEstimate: "a partir de 20/12" });

  it("liberação pela data e hora de Brasília", () => {
    expect(isReleased(a, at("2030-11-15T22:59:59Z"))).toBe(false); // 19:59:59 em Brasília
    expect(isReleased(a, at("2030-11-15T23:00:00Z"))).toBe(true);
    expect(launchLabel(a.launchAt)).toBe("sexta-feira, 15/11, 20:00");
  });

  it("antes do lançamento recusa; depois abre sozinho; limite por pedido soma as peças do mesmo drop", () => {
    const lines = [{ slug: "camiseta-x", quantity: 1 }, { slug: "bone-x", quantity: 1 }, { slug: "outro", quantity: 5 }];
    expect(dropIssues(lines, [a, b], at("2030-11-15T22:00:00Z"))).toEqual([
      { kind: "nao_liberado", slug: "camiseta-x", drop: "Drop a", launchAt: a.launchAt },
      { kind: "nao_liberado", slug: "bone-x", drop: "Drop a", launchAt: a.launchAt },
    ]);
    expect(dropIssues(lines, [a, b], at("2030-11-16T00:00:00Z"))).toEqual([]);
    expect(dropIssues([{ slug: "camiseta-x", quantity: 2 }, { slug: "bone-x", quantity: 1 }], [a], at("2030-11-16T00:00:00Z"))).toEqual([{ kind: "limite", drop: "Drop a", limit: 2 }]);
    expect(dropIssueMessage({ kind: "limite", drop: "Drop a", limit: 2 })).toBe("Drop a: no máximo 2 peças por pedido. Ajuste a sacola.");
  });

  it("drop inativo não trava; vitrine mostra futuros e recentes", () => {
    expect(dropForProduct([{ ...a, active: false }], "camiseta-x")).toBeNull();
    expect(dropIssues([{ slug: "camiseta-x", quantity: 9 }], [{ ...a, active: false }], at("2030-11-01T00:00:00Z"))).toEqual([]);
    const old = drop("old", "2030-09-01T13:00:00Z");
    expect(visibleDrops([b, old, a], at("2030-11-20T00:00:00Z")).map((item) => item.slug)).toEqual(["a", "b"]);
  });
});
