import { describe, expect, it } from "vitest";
import { fillDays, parseDashboardParams, periodDays, todayInSaoPaulo } from "./dashboard";

describe("indicadores do painel", () => {
  const now = new Date("2026-10-23T01:30:00Z"); // 22/10 22:30 em São Paulo

  it("o dia é o de São Paulo", () => {
    expect(todayInSaoPaulo(now)).toBe("2026-10-22");
    expect(periodDays(1, now)).toEqual({ days: ["2026-10-22"], since: "2026-10-22T03:00:00.000Z" });
    expect(periodDays(7, now).days[0]).toBe("2026-10-16");
  });

  it("parâmetros com padrões seguros", () => {
    expect(parseDashboardParams({})).toMatchObject({ lowStock: 3, includeTests: false, period: { days: 7 } });
    expect(parseDashboardParams({ periodo: "90", estoque: "10", testes: "com" })).toMatchObject({ lowStock: 10, includeTests: true, period: { days: 90 } });
    expect(parseDashboardParams({ estoque: "-1" }).lowStock).toBe(3);
  });

  it("preenche os dias vazios", () => {
    expect(fillDays(["2026-10-21", "2026-10-22"], [{ day: "2026-10-22", orders: 2, revenue_cents: 500 }])).toEqual([
      { day: "2026-10-21", orders: 0, revenueCents: 0 },
      { day: "2026-10-22", orders: 2, revenueCents: 500 },
    ]);
  });
});
