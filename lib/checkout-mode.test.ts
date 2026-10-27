import { describe, expect, it } from "vitest";
import { checkoutModeFor } from "./checkout-mode";
import { resolveSiteUrl } from "./site";

describe("modo do checkout", () => {
  it("produção sem provedor real bloqueia; preview e local simulam; com provedor real, real", () => {
    expect(checkoutModeFor({ VERCEL_ENV: "production" }, false)).toBe("bloqueado");
    expect(checkoutModeFor({ VERCEL_ENV: "preview" }, false)).toBe("teste");
    expect(checkoutModeFor({}, false)).toBe("teste");
    expect(checkoutModeFor({ VERCEL_ENV: "production" }, true)).toBe("real");
  });
});

describe("URL do site", () => {
  it("NEXT_PUBLIC_SITE_URL vence; Preview usa a URL da branch; Production o domínio do projeto", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://loja.com.br/", VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "x.vercel.app" })).toBe("https://loja.com.br");
    expect(resolveSiteUrl({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "apex-git-feat-x-time.vercel.app", VERCEL_URL: "apex-abc.vercel.app" })).toBe("https://apex-git-feat-x-time.vercel.app");
    expect(resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "apex-seven-ruddy.vercel.app" })).toBe("https://apex-seven-ruddy.vercel.app");
    expect(resolveSiteUrl({})).toBe("https://apex-seven-ruddy.vercel.app");
  });
});
