import { describe, expect, it } from "vitest";
import { lookupFromRow, normalizeLookupInput } from "./lookup";

describe("consulta de pedido", () => {
  it("normaliza número e e-mail e recusa formatos inválidos", () => {
    expect(normalizeLookupInput(" apx-mh2k-0a1b ", " Maria@Exemplo.COM ")).toEqual({ orderId: "APX-MH2K-0A1B", email: "maria@exemplo.com" });
    expect(normalizeLookupInput("", "maria@exemplo.com")).toBeNull();
    expect(normalizeLookupInput("APX'; drop", "maria@exemplo.com")).toBeNull();
    expect(normalizeLookupInput("APX-1234", "maria")).toBeNull();
  });

  const row = {
    id: "APX-1",
    created_at: "2026-10-22T12:00:00Z",
    status: "aguardando-pagamento" as const,
    payment_method: "pix" as const,
    shipping: { label: "Econômica", days: "Chega em 3 a 6 dias úteis" },
    city: "São Paulo",
    state: "SP",
    total_cents: 1000,
    tracking_code: null,
    shipped_at: null,
    items: [{ name: "Boné", size: "Único", image: null, quantity: 1, slug: "bone", item_status: "separando" as const, tracking_code: null }],
  };

  it("status por item só depois do pagamento; rastreio só quando existe", () => {
    expect(lookupFromRow(row)!.items[0].status).toBeUndefined();
    const paid = lookupFromRow({ ...row, status: "enviado", tracking_code: "BR1", shipped_at: "2026-10-23T12:00:00Z" })!;
    expect(paid.items[0].status).toBe("separando");
    expect(paid.tracking).toEqual({ code: "BR1", shippedAt: "2026-10-23T12:00:00Z" });
    expect(lookupFromRow(null)).toBeNull();
  });
});
