import { describe, expect, it } from "vitest";
import { passwordProblem, passwordWarning, scrub } from "./senha-lib";

describe("senha do administrador", () => {
  it("recusa menos de 10 caracteres e aceita 10 ou mais", () => {
    expect(passwordProblem("curta")).toMatch(/10 caracteres/);
    expect(passwordProblem("1234567890")).toBeNull();
  });
  it("avisa (sem recusar) quando tem menos de 12", () => {
    expect(passwordWarning("1234567890")).toMatch(/12 caracteres/);
    expect(passwordWarning("uma frase bem longa")).toBeNull();
  });
  it("tira a senha de mensagens de erro", () => {
    expect(scrub("falhou com minha-senha-x no meio", "minha-senha-x")).toBe("falhou com *** no meio");
  });
});
