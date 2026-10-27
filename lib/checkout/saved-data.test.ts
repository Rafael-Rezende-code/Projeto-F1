import { describe, expect, it } from "vitest";
import { sanitizeSaved } from "./saved-data";

describe("dados salvos no aparelho", () => {
  it("guarda só contato e endereço; CPF, pagamento e aceite nunca", () => {
    const saved = sanitizeSaved({ name: "Maria", email: "maria@exemplo.com", cep: "01310-100", cpf: "529.982.247-25", method: "boleto", acceptTerms: true, shippingId: "economica" });
    expect(saved).toEqual({ name: "Maria", email: "maria@exemplo.com", cep: "01310-100" });
    expect(JSON.stringify(saved)).not.toContain("529");
  });

  it("ignora lixo, vazio e texto longo demais", () => {
    expect(sanitizeSaved(null)).toBeNull();
    expect(sanitizeSaved("x")).toBeNull();
    expect(sanitizeSaved({ name: "  ", email: 3 })).toBeNull();
    expect(sanitizeSaved({ street: "a".repeat(200), city: "São Paulo" })).toEqual({ city: "São Paulo" });
  });
});
