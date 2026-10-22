import { describe, expect, it } from "vitest";
import { couponFormSchema, couponRow, toIso, toLocalInput } from "./coupon-schema";

const base = { code: "volta10", kind: "percentual" as const, percent: "10", amount: "", minSubtotal: "", startsAt: "", endsAt: "", maxUses: "", active: true, note: "" };

describe("formulário de cupom", () => {
  it("percentual vira linha com código em maiúsculas e sem limites", () => {
    const parsed = couponFormSchema.parse(base);
    expect(couponRow(parsed)).toEqual({ code: "VOLTA10", kind: "percentual", value: 10, min_subtotal_cents: 0, starts_at: null, ends_at: null, max_uses: null, active: true, note: "" });
  });

  it("valor fixo e mínimo em reais → centavos; datas de Brasília → UTC", () => {
    const row = couponRow(couponFormSchema.parse({ ...base, kind: "valor_fixo", amount: "R$ 20,00", minSubtotal: "199,90", startsAt: "2026-11-01T00:00", endsAt: "2026-11-30T23:59", maxUses: "100" }));
    expect(row).toMatchObject({ value: 2000, min_subtotal_cents: 19990, max_uses: 100, starts_at: "2026-11-01T03:00:00.000Z", ends_at: "2026-12-01T02:59:00.000Z" });
    expect(toLocalInput(row.starts_at)).toBe("2026-11-01T00:00");
  });

  it("recusa percentual fora de 1–100, valor fixo zerado, fim antes do início e limite de usos inválido", () => {
    expect(couponFormSchema.safeParse({ ...base, percent: "150" }).success).toBe(false);
    expect(couponFormSchema.safeParse({ ...base, kind: "valor_fixo", amount: "0" }).success).toBe(false);
    expect(couponFormSchema.safeParse({ ...base, startsAt: "2026-11-10T00:00", endsAt: "2026-11-01T00:00" }).success).toBe(false);
    expect(couponFormSchema.safeParse({ ...base, maxUses: "0" }).success).toBe(false);
    expect(couponFormSchema.safeParse({ ...base, code: "a b!" }).success).toBe(false);
    expect(toIso("ontem")).toBeNull();
  });
});
