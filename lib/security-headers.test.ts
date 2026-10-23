import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers.mjs";

describe("cabeçalhos de segurança", () => {
  const keys = (production: boolean) => (securityHeaders({ production }) as { key: string; value: string }[]).map((h) => h.key);

  it("sempre: nosniff, referrer, permissions e frame", () => {
    expect(keys(false)).toEqual(["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]);
    const byKey = Object.fromEntries((securityHeaders({ production: true }) as { key: string; value: string }[]).map((h) => [h.key, h.value]));
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });

  it("HSTS só em produção; sem CSP por enquanto", () => {
    expect(keys(true)).toContain("Strict-Transport-Security");
    expect(keys(false)).not.toContain("Strict-Transport-Security");
    expect(keys(true)).not.toContain("Content-Security-Policy");
  });
});
