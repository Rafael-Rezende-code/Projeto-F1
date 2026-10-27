import { describe, expect, it } from "vitest";
import { dropFormSchema, dropRow } from "./drop-schema";
import { dropWaitlistEmail } from "@/lib/drops-email";

// Drop de TESTE (não é um lançamento real).
const base = { slug: "drop-teste", title: "Drop Teste", description: "", cover: "", launchLocal: "2030-11-15T20:00", mode: "lancamento" as const, shipEstimate: "", perOrderLimit: "2", products: ["bone-hamilton", "bone-hamilton"], active: true };

describe("formulário de drop", () => {
  it("lançamento em Brasília vira UTC; peças sem repetição; limite numérico", () => {
    expect(dropRow(dropFormSchema.parse(base))).toEqual({ slug: "drop-teste", title: "Drop Teste", description: "", cover: null, launch_at: "2030-11-15T23:00:00.000Z", mode: "lancamento", ship_estimate: null, per_order_limit: 2, product_slugs: ["bone-hamilton"], active: true });
  });

  it("pré-venda exige previsão; sem peças, data inválida e capa insegura recusadas", () => {
    const issues = (value: object) => dropFormSchema.safeParse({ ...base, ...value }).error?.issues.map((issue) => issue.path.join(".")) ?? [];
    expect(issues({ mode: "pre_venda" })).toContain("shipEstimate");
    expect(issues({ products: [] })).toContain("products");
    expect(issues({ launchLocal: "2030-02-30T10:00" })).toContain("launchLocal");
    expect(issues({ cover: "javascript:alert(1)" })).toContain("cover");
    expect(issues({ perOrderLimit: "0" })).toContain("perOrderLimit");
  });

  it("e-mail do aviso: escapa o título e leva o link do drop", () => {
    const message = dropWaitlistEmail({ title: "Drop <b>X</b>", slug: "drop-x", launchAt: "2030-11-15T23:00:00.000Z" }, "https://loja.exemplo");
    expect(message.subject).toBe("Drop <b>X</b> foi lançado");
    expect(message.html).toContain("Drop &lt;b&gt;X&lt;/b&gt;");
    expect(message.html).toContain("https://loja.exemplo/drops/drop-x");
    expect(message.text).toContain("https://loja.exemplo/drops/drop-x");
  });
});
