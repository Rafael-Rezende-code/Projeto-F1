import { describe, expect, it } from "vitest";
import { kitFormSchema, kitRow } from "./kit-schema";

const base = { slug: "kit-hamilton", title: "Kit dia de corrida Hamilton", teamSlug: "ferrari", driverSlug: "hamilton", products: ["camiseta-hamilton", "bone-hamilton", "poster-hamilton"], percent: "10", active: true };

describe("formulário de kit", () => {
  it("válido vira a linha da tabela", () => {
    const parsed = kitFormSchema.parse(base);
    expect(kitRow(parsed)).toEqual({ slug: "kit-hamilton", title: "Kit dia de corrida Hamilton", team_slug: "ferrari", driver_slug: "hamilton", product_slugs: ["camiseta-hamilton", "bone-hamilton", "poster-hamilton"], discount_percent: 10, active: true });
  });

  it("recusa peças repetidas, menos de 2, percentual fora de 1–50, slug inválido e kit sem equipe nem piloto", () => {
    const issues = (value: object) => kitFormSchema.safeParse({ ...base, ...value }).error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(issues({ products: ["a", "a"] })).toContain("products");
    expect(issues({ products: ["a", ""] })).toContain("products");
    expect(issues({ percent: "60" })).toContain("percent");
    expect(issues({ percent: "0" })).toContain("percent");
    expect(issues({ slug: "Kit Hamilton" })).toContain("slug");
    expect(issues({ teamSlug: "", driverSlug: "" })).toContain("teamSlug");
  });
});
