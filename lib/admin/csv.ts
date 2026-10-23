// CSV para planilhas brasileiras (operação, fase 2): UTF-8 com BOM, separador ";", vírgula decimal, CRLF. Células que
// começam com = + - @ ganham um apóstrofo (proteção contra fórmula embutida ao abrir no Excel). Testes em csv.test.ts.
export type Cell = string | number | boolean | null | undefined;

const cell = (value: Cell) => {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "boolean" ? (value ? "sim" : "não") : String(value);
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(header: string[], rows: Cell[][]) {
  return "﻿" + [header, ...rows].map((line) => line.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** Centavos → "1234,56" (sem separador de milhar, que confunde a importação). */
export const centsToDecimal = (cents: number | null | undefined) => {
  const value = Math.round(cents ?? 0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
};

/** Data/hora no fuso de São Paulo, "2026-10-23 14:05" (ordena certo na planilha). */
export const csvDateTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return parts.replace("T", " ");
};

export const csvResponse = (body: string, name: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });

/** "AAAA-MM-DD" válido → início do dia (ou do dia seguinte, para o fim do período) em São Paulo (UTC−3). */
export function dayBoundary(day: string | undefined, end = false) {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}
