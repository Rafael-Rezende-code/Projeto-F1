import { describe, expect, it } from "vitest";
import { canCancel, needsShippedConfirmation, orderActionMessage } from "./order-actions";

describe("ações de pedido no painel", () => {
  it("traduz os erros do banco e cai numa mensagem genérica", () => {
    expect(orderActionMessage({ message: "CONFIRMAR_ENVIADO" })).toMatch(/já foi enviado/);
    expect(orderActionMessage({ message: "ERROR: SEM_PERMISSAO" })).toMatch(/Sem permissão/);
    expect(orderActionMessage({ message: "timeout" })).toMatch(/Tente de novo/);
    expect(orderActionMessage(null)).toMatch(/Tente de novo/);
  });

  it("regras de cancelamento", () => {
    expect(canCancel("cancelado")).toBe(false);
    expect(canCancel("pago")).toBe(true);
    expect(needsShippedConfirmation("enviado")).toBe(true);
    expect(needsShippedConfirmation("pago")).toBe(false);
  });
});
