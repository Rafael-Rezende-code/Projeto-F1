import { createHash } from "node:crypto";

// Newsletter: peças puras (com testes em lib/newsletter.test.ts). O formulário é components/newsletter-form.tsx, a gravação
// é app/actions/newsletter.ts (Supabase, tabela newsletter_subscribers: supabase/migrations/20261025000000_newsletter.sql).

export { NEWSLETTER_CONSENT_LABEL, NEWSLETTER_CONSENT_TEXT, NEWSLETTER_PURPOSE } from "@/lib/newsletter-text";

export type SubscriptionInput = { email: string; consent: boolean; honeypot: string };

/** Lê os campos do formulário (sem confiar em nada: e-mail em minúsculas e sem espaços, consentimento só com "on"). */
export function readSubscription(form: { get(name: string): FormDataEntryValue | null }): SubscriptionInput {
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    consent: form.get("consent") === "on",
    // Campo isca ("website"): escondido para pessoas; robôs costumam preencher.
    honeypot: String(form.get("website") ?? "").trim(),
  };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isValidEmail = (email: string) => email.length >= 5 && email.length <= 254 && EMAIL.test(email);

/** Primeiro IP do cabeçalho x-forwarded-for ("cliente, proxy1, proxy2"). */
export const firstIp = (forwardedFor: string | null | undefined) => (forwardedFor ?? "").split(",")[0]?.trim() || null;

/** Hash do IP com sal (SHA-256 em hex): o IP em si nunca é gravado. */
export const hashIp = (ip: string, salt: string) => createHash("sha256").update(`${salt}:${ip}`).digest("hex");

export type SubscriberRow = { email: string; created_at: string; source: string; consent_text: string; unsubscribed_at: string | null };

/**
 * CSV da lista (para o painel): cabeçalho em português, separador ";" e BOM (abre certo no Excel). Células que começam com
 * = + - @ ganham um apóstrofo na frente (proteção contra fórmula embutida quando a planilha é aberta).
 */
export function subscribersCsv(rows: SubscriberRow[]) {
  const safe = (value: string) => {
    const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [["e-mail", "inscrito_em", "origem", "consentimento", "descadastrado_em"], ...rows.map((row) => [row.email, row.created_at, row.source, row.consent_text, row.unsubscribed_at ?? ""])];
  return "﻿" + lines.map((line) => line.map(safe).join(";")).join("\r\n") + "\r\n";
}
