import { toCsv, csvDateTime } from "@/lib/admin/csv";
import { isValidEmail } from "@/lib/newsletter";

// "Avise-me quando chegar" (refino 3, item 2.4): peças puras (testes em stock-alerts.test.ts). Formulário em
// components/stock-alert-form.tsx; gravação em app/actions/stock-alerts.ts (tabela stock_alerts, migração
// 20261031000000_avise_me.sql); lista e CSV em /admin/avise-me.
export { STOCK_ALERT_CONSENT_LABEL, STOCK_ALERT_CONSENT_TEXT, STOCK_ALERT_PURPOSE } from "@/lib/stock-alerts-text";

export type StockAlertInput = { email: string; sku: string; consent: boolean; honeypot: string };

/** Lê os campos (e-mail em minúsculas e sem espaços, SKU só com letras/números/hífen, consentimento só com "on"). */
export function readStockAlert(form: { get(name: string): FormDataEntryValue | null }): StockAlertInput {
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    sku: String(form.get("sku") ?? "").trim().toUpperCase(),
    consent: form.get("consent") === "on",
    honeypot: String(form.get("website") ?? "").trim(),
  };
}

export type StockAlertCheck = { ok: true } | { ok: false; message: string };
export function validateStockAlert(input: StockAlertInput): StockAlertCheck {
  if (!/^[A-Z0-9._-]{2,60}$/.test(input.sku)) return { ok: false, message: "Escolha um tamanho esgotado." };
  if (!isValidEmail(input.email)) return { ok: false, message: "Informe um e-mail válido." };
  if (!input.consent) return { ok: false, message: "Marque a caixa para receber o aviso." };
  return { ok: true };
}

export type StockAlertRow = { email: string; sku: string; created_at: string; notified_at: string | null; product?: string; size?: string };
/** CSV da lista (painel): ; + BOM, datas em São Paulo, proteção contra fórmula (lib/admin/csv.ts). */
export const stockAlertsCsv = (rows: StockAlertRow[]) =>
  toCsv(["e-mail", "produto", "tamanho", "sku", "pedido_em", "avisado_em"], rows.map((row) => [row.email, row.product ?? "", row.size ?? "", row.sku, csvDateTime(row.created_at), csvDateTime(row.notified_at)]));
