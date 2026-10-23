import { dayBoundary } from "@/lib/admin/csv";
import type { OrderStatus } from "@/lib/checkout/order";

// Filtros da lista de pedidos do painel e da exportação CSV (os dois usam os mesmos parâmetros da URL).
export const ORDER_STATUS_FILTERS: (OrderStatus | "")[] = ["", "pago", "aguardando-pagamento", "enviado", "entregue", "recusado", "cancelado"];
export type TestFilter = "sem" | "com" | "so";
export type OrderFilters = { status: OrderStatus | ""; from: string; to: string; tests: TestFilter };

export function parseOrderFilters(params: Record<string, string | string[] | undefined>): OrderFilters {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const status = ORDER_STATUS_FILTERS.includes(one("status") as OrderStatus) ? (one("status") as OrderStatus) : "";
  const tests = (["sem", "com", "so"] as const).find((value) => value === one("testes")) ?? "sem";
  return { status, from: dayBoundary(one("de")) ? one("de") : "", to: dayBoundary(one("ate")) ? one("ate") : "", tests };
}

export function orderFiltersQuery(filters: OrderFilters, extra: Record<string, string> = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.from) query.set("de", filters.from);
  if (filters.to) query.set("ate", filters.to);
  if (filters.tests !== "sem") query.set("testes", filters.tests);
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  const text = query.toString();
  return text ? `?${text}` : "";
}

type Filterable<T> = { eq(column: string, value: unknown): T; gte(column: string, value: unknown): T; lt(column: string, value: unknown): T };

/** Aplica os filtros a uma consulta do supabase-js em "orders". */
export function applyOrderFilters<T extends Filterable<T>>(query: T, filters: OrderFilters): T {
  let q = query;
  if (filters.status) q = q.eq("status", filters.status);
  const from = dayBoundary(filters.from);
  const to = dayBoundary(filters.to, true);
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lt("created_at", to);
  if (filters.tests === "sem") q = q.eq("is_test", false);
  if (filters.tests === "so") q = q.eq("is_test", true);
  return q;
}
