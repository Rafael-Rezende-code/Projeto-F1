import { z } from "zod";
import { normalizeCouponCode } from "@/lib/coupons";
import { toCents } from "./product-schema";

// Formulário de cupom do painel (operação, fase 1c). Valores em reais no formulário → centavos no banco; datas do
// <input type="datetime-local"> (horário de Brasília, -03:00) → ISO. Testes em coupon-schema.test.ts.
export const couponFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z.string().trim(),
    kind: z.enum(["percentual", "valor_fixo", "frete_gratis"]),
    percent: z.string().trim(),
    amount: z.string().trim(),
    minSubtotal: z.string().trim(),
    startsAt: z.string().trim(),
    endsAt: z.string().trim(),
    maxUses: z.string().trim(),
    active: z.boolean(),
    note: z.string().trim().max(300),
  })
  .superRefine((value, ctx) => {
    if (!normalizeCouponCode(value.code)) ctx.addIssue({ code: "custom", path: ["code"], message: "Use 3 a 40 letras, números, - ou _." });
    if (value.kind === "percentual") {
      const percent = Number(value.percent.replace(",", "."));
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) ctx.addIssue({ code: "custom", path: ["percent"], message: "De 1 a 100 (número inteiro)." });
    }
    if (value.kind === "valor_fixo") {
      const amount = toCents(value.amount);
      if (amount === null || Number.isNaN(amount) || amount <= 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "Informe o valor (ex.: 20,00)." });
    }
    if (Number.isNaN(toCents(value.minSubtotal))) ctx.addIssue({ code: "custom", path: ["minSubtotal"], message: "Valor inválido." });
    if (value.maxUses && !/^\d+$/.test(value.maxUses)) ctx.addIssue({ code: "custom", path: ["maxUses"], message: "Número inteiro (ou vazio = sem limite)." });
    else if (value.maxUses && Number(value.maxUses) < 1) ctx.addIssue({ code: "custom", path: ["maxUses"], message: "Pelo menos 1 (ou vazio = sem limite)." });
    const start = toIso(value.startsAt);
    const end = toIso(value.endsAt);
    if (value.startsAt && !start) ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Data inválida." });
    if (value.endsAt && !end) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Data inválida." });
    if (start && end && end <= start) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "O fim precisa ser depois do início." });
  });

export type CouponForm = z.infer<typeof couponFormSchema>;

/** "2026-11-01T09:30" (horário de Brasília) → ISO em UTC; vazio → null; inválido → null. */
export function toIso(local: string) {
  if (!local) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const date = new Date(`${local}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO → valor do <input type="datetime-local"> em horário de Brasília. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return date.toISOString().slice(0, 16);
}

/** Formulário (já validado) → linha da tabela coupons. */
export function couponRow(form: CouponForm) {
  return {
    code: normalizeCouponCode(form.code)!,
    kind: form.kind,
    value: form.kind === "percentual" ? Number(form.percent.replace(",", ".")) : form.kind === "valor_fixo" ? toCents(form.amount)! : 0,
    min_subtotal_cents: toCents(form.minSubtotal) ?? 0,
    starts_at: toIso(form.startsAt),
    ends_at: toIso(form.endsAt),
    max_uses: form.maxUses ? Number(form.maxUses) : null,
    active: form.active,
    note: form.note,
  };
}
