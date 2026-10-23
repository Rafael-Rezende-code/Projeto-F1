import { dayBoundary } from "@/lib/admin/csv";

// Início do painel (operação, fase 2): período, série diária com os dias vazios preenchidos e leitura dos parâmetros da
// URL. Os números vêm da função admin_dashboard do banco. Puro (testes em dashboard.test.ts).
export const DASHBOARD_PERIODS = [
  { value: "hoje", label: "Hoje", days: 1 },
  { value: "7", label: "7 dias", days: 7 },
  { value: "30", label: "30 dias", days: 30 },
  { value: "90", label: "90 dias", days: 90 },
] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["value"];

export type DashboardData = {
  orders: number;
  revenue_cents: number;
  average_cents: number;
  by_day: { day: string; orders: number; revenue_cents: number }[];
  best_sellers: { slug: string; name: string; quantity: number; revenue: number }[];
  awaiting_supplier: number;
  paid_not_shipped: number;
  low_stock: { sku: string; size: string; stock: number; name: string; slug: string }[];
};

/** "AAAA-MM-DD" de hoje em São Paulo. */
export const todayInSaoPaulo = (now: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(now);

const addDays = (day: string, delta: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

export function parseDashboardParams(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const period = DASHBOARD_PERIODS.find((item) => item.value === one("periodo")) ?? DASHBOARD_PERIODS[1];
  const low = Number.parseInt(one("estoque"), 10);
  return { period, lowStock: Number.isFinite(low) && low >= 0 && low <= 999 ? low : 3, includeTests: one("testes") === "com" };
}

/** Dias do período (do mais antigo a hoje) e o instante de início (meia-noite de São Paulo). */
export function periodDays(days: number, now: Date) {
  const today = todayInSaoPaulo(now);
  const list = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  return { days: list, since: dayBoundary(list[0])! };
}

/** Série diária com zero nos dias sem pedido. */
export function fillDays(days: string[], byDay: DashboardData["by_day"]) {
  const map = new Map(byDay.map((row) => [row.day.slice(0, 10), row]));
  return days.map((day) => ({ day, orders: map.get(day)?.orders ?? 0, revenueCents: map.get(day)?.revenue_cents ?? 0 }));
}
