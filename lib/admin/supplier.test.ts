import { describe, expect, it } from "vitest";
import { supplierAddressText } from "./supplier";

describe("dados para o fornecedor", () => {
  it("monta o endereço em linhas, com CEP formatado", () => {
    const text = supplierAddressText(
      { name: "Maria Silva", email: "maria@exemplo.com", phone: "(35) 99999-0000" },
      { street: "Rua A", number: "10", complement: "ap. 2", district: "Centro", city: "São Sebastião do Paraíso", state: "MG", cep: "37950000" },
    );
    expect(text).toBe("Maria Silva\nRua A, 10 – ap. 2\nCentro – São Sebastião do Paraíso/MG\nCEP 37950-000\nTelefone: (35) 99999-0000\nE-mail: maria@exemplo.com");
  });

  it("sem telefone, a linha some", () => {
    expect(supplierAddressText({ name: "A", email: "a@b.c" }, { street: "R", number: "1", district: "B", city: "C", state: "SP", cep: "01000-000" })).not.toContain("Telefone");
  });
});
