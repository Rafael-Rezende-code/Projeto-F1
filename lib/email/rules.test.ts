import { describe, expect, it } from "vitest";
import { emailsForStatusChange } from "./rules";

describe("quando sai e-mail", () => {
  it("só nas mudanças que o cliente precisa saber", () => {
    expect(emailsForStatusChange("aguardando-pagamento", "pago")).toEqual(["pagamento-aprovado"]);
    expect(emailsForStatusChange("pago", "pago")).toEqual([]);
    expect(emailsForStatusChange("pago", "enviado")).toEqual(["enviado"]);
    expect(emailsForStatusChange("aguardando-pagamento", "cancelado")).toEqual(["cancelado"]);
    expect(emailsForStatusChange("aguardando-pagamento", "recusado")).toEqual([]);
    expect(emailsForStatusChange("enviado", "pago")).toEqual([]);
  });
});
