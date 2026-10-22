import { describe, expect, it } from "vitest";
import { companyFacts, documentLabel } from "./company";

describe("companyFacts", () => {
  it("mostra só os campos preenchidos, sem placeholders", () => {
    expect(companyFacts({ tradeName: "Apex" })).toEqual([]);
    const facts = companyFacts({ tradeName: "Apex", email: "contato@exemplo.com" });
    expect(facts.map((fact) => fact.key)).toEqual(["email"]);
    expect(facts[0]).toMatchObject({ label: "E-mail", href: "mailto:contato@exemplo.com" });
  });

  it("identifica CPF e CNPJ pelo número de dígitos", () => {
    expect(documentLabel("123.456.789-09")).toBe("CPF");
    expect(documentLabel("12.345.678/0001-90")).toBe("CNPJ");
  });

  it("nenhum dado da empresa no código é placeholder entre colchetes", async () => {
    const { company } = await import("./company");
    for (const value of Object.values(company)) if (value) expect(value).not.toMatch(/\[.*\]/);
  });
});
