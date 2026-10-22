import { describe, expect, it } from "vitest";
import { adminEnvStatus } from "./env-status";

describe("variáveis do painel", () => {
  it("só nome e ✓/✗; nunca o valor", () => {
    const secret = "valor-secreto-123";
    const status = adminEnvStatus({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: secret, ADMIN_EMAILS: "  " });
    expect(status.map((item) => [item.name, item.set])).toEqual([
      ["NEXT_PUBLIC_SUPABASE_URL", true],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", false],
      ["SUPABASE_SERVICE_ROLE_KEY", true],
      ["ADMIN_EMAILS", false],
      ["NEXT_PUBLIC_SITE_URL", false],
    ]);
    expect(JSON.stringify(status)).not.toContain(secret);
    expect(JSON.stringify(status)).not.toContain("supabase.co");
  });
});
