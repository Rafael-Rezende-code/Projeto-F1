import { describe, expect, it } from "vitest";
import { applyOrderFilters, orderFiltersQuery, parseOrderFilters } from "./order-filters";

describe("filtros de pedidos", () => {
  it("lê só valores válidos e monta a URL de volta", () => {
    const filters = parseOrderFilters({ status: "pago", de: "2026-10-01", ate: "lixo", testes: "so" });
    expect(filters).toEqual({ status: "pago", from: "2026-10-01", to: "", tests: "so" });
    expect(parseOrderFilters({ status: "hackeado" }).status).toBe("");
    expect(orderFiltersQuery(filters)).toBe("?status=pago&de=2026-10-01&testes=so");
    expect(orderFiltersQuery(parseOrderFilters({}))).toBe("");
  });

  it("aplica status, período (fuso de São Paulo) e testes", () => {
    const calls: unknown[][] = [];
    const fake = { eq: (...a: unknown[]) => (calls.push(["eq", ...a]), fake), gte: (...a: unknown[]) => (calls.push(["gte", ...a]), fake), lt: (...a: unknown[]) => (calls.push(["lt", ...a]), fake) };
    applyOrderFilters(fake, { status: "enviado", from: "2026-10-01", to: "2026-10-31", tests: "sem" });
    expect(calls).toEqual([
      ["eq", "status", "enviado"],
      ["gte", "created_at", "2026-10-01T03:00:00.000Z"],
      ["lt", "created_at", "2026-11-01T03:00:00.000Z"],
      ["eq", "is_test", false],
    ]);
  });
});
