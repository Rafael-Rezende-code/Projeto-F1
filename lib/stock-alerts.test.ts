import { describe, expect, it } from "vitest";
import { readStockAlert, stockAlertsCsv, validateStockAlert } from "./stock-alerts";

const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

describe("Avise-me quando chegar", () => {
  it("lê o formulário sem confiar em nada", () => {
    expect(readStockAlert(form({ email: "  Maria@Exemplo.COM ", sku: "apx-001-m", consent: "on", website: "" }))).toEqual({ email: "maria@exemplo.com", sku: "APX-001-M", consent: true, honeypot: "" });
    expect(readStockAlert(form({ consent: "true" })).consent).toBe(false);
  });

  it("exige SKU, e-mail válido e consentimento", () => {
    const ok = { email: "maria@exemplo.com", sku: "APX-001-M", consent: true, honeypot: "" };
    expect(validateStockAlert(ok)).toEqual({ ok: true });
    expect(validateStockAlert({ ...ok, sku: "" }).ok).toBe(false);
    expect(validateStockAlert({ ...ok, sku: "x; drop" }).ok).toBe(false);
    expect(validateStockAlert({ ...ok, email: "sem-arroba" }).ok).toBe(false);
    expect(validateStockAlert({ ...ok, consent: false }).ok).toBe(false);
  });

  it("CSV com produto, tamanho e proteção contra fórmula", () => {
    const csv = stockAlertsCsv([{ email: "=cmd@x.com", sku: "APX-001-M", product: "Jaqueta", size: "M", created_at: "2026-10-26T15:00:00Z", notified_at: null }]);
    expect(csv.startsWith("﻿e-mail;produto;tamanho;sku")).toBe(true);
    expect(csv).toContain("'=cmd@x.com;Jaqueta;M;APX-001-M;2026-10-26 12:00;");
  });
});
