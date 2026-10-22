import { describe, expect, it } from "vitest";
import { firstIp, hashIp, isValidEmail, NEWSLETTER_CONSENT_TEXT, NEWSLETTER_PURPOSE, readSubscription, subscribersCsv } from "./newsletter";

const form = (fields: Record<string, string>) => ({ get: (name: string) => (name in fields ? fields[name] : null) });

describe("newsletter (lib/newsletter.ts)", () => {
  it("lê o formulário: e-mail em minúsculas, consentimento só com 'on', isca separada", () => {
    expect(readSubscription(form({ email: "  Ana@Exemplo.COM ", consent: "on", website: "" }))).toEqual({ email: "ana@exemplo.com", consent: true, honeypot: "" });
    expect(readSubscription(form({ email: "a@b.co", consent: "true" })).consent).toBe(false);
    expect(readSubscription(form({ email: "a@b.co" })).consent).toBe(false);
    expect(readSubscription(form({ email: "a@b.co", consent: "on", website: "http://spam" })).honeypot).toBe("http://spam");
  });

  it("valida e-mail", () => {
    for (const ok of ["a@b.co", "nome.sobrenome+x@dominio.com.br"]) expect(isValidEmail(ok)).toBe(true);
    for (const bad of ["", "a@b", "a b@c.com", "@c.com", "a@@c.com", `${"x".repeat(250)}@c.com`]) expect(isValidEmail(bad)).toBe(false);
  });

  it("o IP vira hash com sal (nunca é guardado) e vem do primeiro item do x-forwarded-for", () => {
    expect(firstIp("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
    expect(firstIp(null)).toBeNull();
    const hash = hashIp("203.0.113.9", "sal");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
    expect(hashIp("203.0.113.9", "sal")).toBe(hash);
    expect(hashIp("203.0.113.9", "outro-sal")).not.toBe(hash);
  });

  it("o consentimento gravado traz a finalidade (só diz para que o e-mail serve)", () => {
    expect(NEWSLETTER_CONSENT_TEXT).toContain(NEWSLETTER_PURPOSE);
    expect(NEWSLETTER_CONSENT_TEXT.length).toBeGreaterThanOrEqual(10);
    expect(NEWSLETTER_CONSENT_TEXT.length).toBeLessThanOrEqual(600);
    // Nada de promessa que o site não cumpre sozinho.
    expect(NEWSLETTER_CONSENT_TEXT.toLowerCase()).not.toMatch(/cancel|descadastr|terceiros|nunca/);
  });

  it("CSV para o Excel: BOM, ';', aspas e proteção contra fórmula", () => {
    const csv = subscribersCsv([
      { email: "ana@exemplo.com", created_at: "2026-10-22T12:00:00Z", source: "home", consent_text: 'Quero; receber "tudo".', unsubscribed_at: null },
      { email: "=cmd|' /C calc'!A0@x.com", created_at: "2026-10-22T13:00:00Z", source: "home", consent_text: "ok", unsubscribed_at: "2026-10-23T00:00:00Z" },
    ]);
    expect(csv.startsWith("﻿e-mail;inscrito_em;origem;consentimento;descadastrado_em\r\n")).toBe(true);
    expect(csv).toContain('ana@exemplo.com;2026-10-22T12:00:00Z;home;"Quero; receber ""tudo""."');
    expect(csv).toContain("'=cmd|' /C calc'!A0@x.com");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
