import { describe, expect, it } from "vitest";
import { createMask, jwtRole, maskEmail, parseEnv, secretsFrom } from "../../scripts/supabase/ativar-lib";

// Peças do `pnpm supabase:ativar` que não tocam o banco: leitura do .env.local e, principalmente, a máscara que garante
// que nenhuma chave aparece no relatório (as chaves de exemplo abaixo são FALSAS).
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const fakeJwt = (role: string) => `eyJ${b64({ alg: "HS256" }).slice(3)}.${b64({ role, iss: "supabase" })}.assinaturafalsaassinaturafalsa123`;

describe("ativar: .env.local e segredos", () => {
  it("lê CHAVE=valor com aspas, export e comentários", () => {
    const env = parseEnv('# comentário\nA=1\nexport B="com espaço"\nC=\'x\'\n  D = y \nlinha inválida\n');
    expect(env).toEqual({ A: "1", B: "com espaço", C: "x", D: "y" });
  });

  it("a máscara esconde os valores conhecidos e qualquer coisa com cara de chave", () => {
    const service = fakeJwt("service_role");
    const env = { SUPABASE_SERVICE_ROLE_KEY: service, MP_ACCESS_TOKEN: "APP_USR-123456789-segredo", NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", ADMIN_EMAILS: "a@b.com" };
    const mask = createMask(secretsFrom(env));
    const text = `erro com ${service} e ${env.MP_ACCESS_TOKEN} e sb_secret_abcdefghijkl12345 e sbp_0123456789abcdef0123 e url ${env.NEXT_PUBLIC_SUPABASE_URL}`;
    const out = mask(text);
    expect(out).not.toContain(service);
    expect(out).not.toContain("APP_USR-123456789-segredo");
    expect(out).not.toContain("sb_secret_abcdefghijkl12345");
    expect(out).not.toContain("sbp_0123456789abcdef0123");
    expect(out).toContain("https://abc.supabase.co"); // a URL pública não é segredo
    // JWT desconhecido (não estava no .env.local) também é escondido.
    expect(mask(`token ${fakeJwt("anon")}`)).toContain("«chave oculta»");
  });

  it("só variáveis com KEY/SECRET/TOKEN/PASSWORD no nome entram na lista de segredos", () => {
    expect(secretsFrom({ A_KEY: "k", URL: "u", DB_PASSWORD: "p", EMPTY_TOKEN: "" })).toEqual(["k", "p"]);
  });

  it("reconhece o papel da chave (para avisar se anon e service_role estiverem trocadas)", () => {
    expect(jwtRole(fakeJwt("anon"))).toBe("anon");
    expect(jwtRole(fakeJwt("service_role"))).toBe("service_role");
    expect(jwtRole("sb_secret_semjwt")).toBeNull();
  });

  it("e-mails aparecem mascarados no relatório", () => {
    expect(maskEmail("dono@loja.com")).toBe("d***@loja.com");
  });
});
