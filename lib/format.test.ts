import { describe, expect, it } from "vitest";
import { discountPercent, formatPrice } from "./format";

// Intl usa espaço não separável (U+00A0) entre "R$" e o valor.
const nb = (text: string) => text.replace(/ /g, " ");

describe("formatPrice", () => {
  it("formata centavos em BRL no padrão pt-BR", () => {
    expect(nb(formatPrice(64990))).toBe("R$ 649,90");
    expect(nb(formatPrice(100))).toBe("R$ 1,00");
    expect(nb(formatPrice(5))).toBe("R$ 0,05");
    expect(nb(formatPrice(0))).toBe("R$ 0,00");
  });
  it("usa ponto como separador de milhar", () => {
    expect(nb(formatPrice(123456789))).toBe("R$ 1.234.567,89");
  });
});

describe("discountPercent", () => {
  it("calcula o desconto arredondado", () => {
    expect(discountPercent(39990, 45990)).toBe(13);
  });
  it("é zero sem preço 'de' ou quando ele não é maior", () => {
    expect(discountPercent(1000)).toBe(0);
    expect(discountPercent(1000, 900)).toBe(0);
  });
});
