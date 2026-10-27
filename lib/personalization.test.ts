import { describe, expect, it } from "vitest";
import { cartLineKey, contrastText, normalizeName, personalizationLabel, validatePersonalization } from "./personalization";

const config = { maxName: 12, numberMin: 0, numberMax: 99 };

describe("personalização", () => {
  it("nome em maiúsculas, acentos convertidos, só letras, números, espaço e hífen", () => {
    expect(normalizeName("joão  d'ávila!")).toBe("JOAO DAVILA");
    expect(normalizeName("ana-maria")).toBe("ANA-MARIA");
    expect(validatePersonalization({ name: " Çéu ", number: "07" }, config)).toEqual({ ok: true, value: { name: "CEU", number: "7" } });
  });

  it("limite de caracteres e faixa de número, com mensagens em português", () => {
    expect(validatePersonalization({ name: "ABCDEFGHIJKLM" }, config)).toEqual({ ok: false, errors: { name: "Use até 12 caracteres." } });
    expect(validatePersonalization({ number: "100" }, config)).toEqual({ ok: false, errors: { number: "Escolha um número de 0 a 99." } });
    expect(validatePersonalization({ number: "1a" }, config)).toEqual({ ok: false, errors: { number: "Use só números." } });
    expect(validatePersonalization({}, config)).toEqual({ ok: false, errors: { name: "Escreva um nome ou escolha um número." } });
    expect(validatePersonalization({ number: "44" }, config)).toEqual({ ok: true, value: { number: "44" } });
  });

  it("palavras bloqueadas, inclusive com espaços ou hífens no meio; nomes comuns passam", () => {
    for (const name of ["porra", "P O R R A", "pu-ta", "FDP"]) expect(validatePersonalization({ name }, config).ok).toBe(false);
    for (const name of ["Cunha", "Sasha", "Rolando", "Senna"]) expect(validatePersonalization({ name }, config).ok).toBe(true);
  });

  it("identidade do item: produto + tamanho + personalização", () => {
    expect(cartLineKey("APX-1-M")).toBe("APX-1-M");
    expect(cartLineKey("APX-1-M", { name: "LEWIS", number: "44" })).toBe("APX-1-M|LEWIS|44");
    expect(cartLineKey("APX-1-M", { name: "LEWIS" })).not.toBe(cartLineKey("APX-1-M", { name: "LEWIS", number: "44" }));
    expect(personalizationLabel({ name: "LEWIS", number: "44" })).toBe("Nome: LEWIS · Nº 44");
  });

  it("texto branco sobre cores escuras e preto sobre claras", () => {
    expect(contrastText("#DC0000")).toBe("#ffffff");
    expect(contrastText("#FFD700")).toBe("#000000");
  });
});
