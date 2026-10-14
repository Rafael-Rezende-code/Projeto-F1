import { describe, expect, it } from "vitest";
import { isValidCpf, isValidPhone, maskCep, maskCpf, maskPhone } from "./br";

describe("CPF", () => {
  it("aceita CPFs com dígitos verificadores corretos (com ou sem máscara)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("recusa dígito errado, sequência repetida e tamanho errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("aplica a máscara progressivamente", () => {
    expect(maskCpf("529")).toBe("529");
    expect(maskCpf("5299822")).toBe("529.982.2");
    expect(maskCpf("52998224725999")).toBe("529.982.247-25");
  });
});

describe("CEP e telefone", () => {
  it("mascara CEP", () => {
    expect(maskCep("01310100")).toBe("01310-100");
    expect(maskCep("0131")).toBe("0131");
  });
  it("mascara e valida telefone", () => {
    expect(maskPhone("11912345678")).toBe("(11) 91234-5678");
    expect(maskPhone("1132345678")).toBe("(11) 3234-5678");
    expect(isValidPhone("(11) 91234-5678")).toBe(true);
    expect(isValidPhone("(01) 91234-5678")).toBe(false);
  });
});
