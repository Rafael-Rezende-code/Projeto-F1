import { afterEach, describe, expect, it, vi } from "vitest";
import { LOGIN_BLOCKED, LOGIN_DENIED, LOGIN_ERROR, attemptLogin, failureDelayMs, type LoginDeps } from "./login";

const SECRET = "Senha-Muito-Secreta-123";

function deps(overrides: Partial<LoginDeps> = {}) {
  const calls: string[] = [];
  const base: LoginDeps = {
    allow: async (bucket) => (calls.push(`allow:${bucket}`), true),
    recordFailure: async () => (calls.push("falha"), 1),
    signIn: async (email, password) => (calls.push("signIn"), email === "admin@apex.test" && password === SECRET ? "admin@apex.test" : null),
    isAdminEmail: (email) => email === "admin@apex.test",
    isAdminInDatabase: async () => true,
    signOut: async () => void calls.push("signOut"),
    sleep: async (ms) => void calls.push(`espera:${ms}`),
  };
  return { calls, deps: { ...base, ...overrides } };
}

afterEach(() => vi.restoreAllMocks());

describe("login do painel (e-mail e senha)", () => {
  it("senha certa de um admin: entra", async () => {
    const { deps: d, calls } = deps();
    expect(await attemptLogin(d, " Admin@Apex.test ", SECRET)).toEqual({ status: "ok" });
    expect(calls).not.toContain("signOut");
  });

  it("senha errada: mensagem genérica, conta a falha e espera", async () => {
    const { deps: d, calls } = deps();
    expect(await attemptLogin(d, "admin@apex.test", "errada")).toEqual({ status: "error", message: LOGIN_ERROR });
    expect(calls).toEqual(["allow:admin-login-ip", "allow:admin-login-email", "signIn", "falha", "espera:500"]);
  });

  it("e-mail que não existe recebe a MESMA mensagem da senha errada", async () => {
    const { deps: d } = deps();
    const wrongPassword = await attemptLogin(d, "admin@apex.test", "errada");
    const unknownEmail = await attemptLogin(d, "ninguem@exemplo.com", SECRET);
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it("formato inválido (e-mail ou senha vazios) recebe a mesma mensagem e nem chega ao Supabase", async () => {
    const { deps: d, calls } = deps();
    expect(await attemptLogin(d, "isto-nao-e-email", SECRET)).toEqual({ status: "error", message: LOGIN_ERROR });
    expect(await attemptLogin(d, "admin@apex.test", "")).toEqual({ status: "error", message: LOGIN_ERROR });
    expect(calls).toEqual([]);
  });

  it("senha certa, mas e-mail que não é admin: encerra a sessão e nega o acesso", async () => {
    const { deps: d, calls } = deps({ signIn: async () => "cliente@exemplo.com" });
    expect(await attemptLogin(d, "cliente@exemplo.com", SECRET)).toEqual({ status: "error", message: LOGIN_DENIED });
    expect(calls).toContain("signOut");
  });

  it("e-mail em ADMIN_EMAILS mas fora de admin_emails (banco): também nega e encerra", async () => {
    const { deps: d, calls } = deps({ isAdminInDatabase: async () => false });
    expect(await attemptLogin(d, "admin@apex.test", SECRET)).toEqual({ status: "error", message: LOGIN_DENIED });
    expect(calls).toContain("signOut");
  });

  it("limite por IP ou por e-mail: bloqueia sem tentar a senha", async () => {
    for (const blocked of ["admin-login-ip", "admin-login-email"]) {
      const { deps: d, calls } = deps({ allow: async (bucket) => bucket !== blocked });
      expect(await attemptLogin(d, "admin@apex.test", SECRET)).toEqual({ status: "error", message: LOGIN_BLOCKED });
      expect(calls).not.toContain("signIn");
    }
  });

  it("o atraso cresce a cada falha e para em 8 s", () => {
    expect([1, 2, 3, 4, 5, 9].map(failureDelayMs)).toEqual([500, 1000, 2000, 4000, 8000, 8000]);
    expect(failureDelayMs(0)).toBe(500);
  });

  it("a senha não aparece em nenhum log nem em nenhuma mensagem de retorno", async () => {
    const logs: string[] = [];
    for (const method of ["log", "error", "warn", "info", "debug"] as const) vi.spyOn(console, method).mockImplementation((...args) => void logs.push(args.map(String).join(" ")));
    const { deps: d } = deps();
    const results = [await attemptLogin(d, "admin@apex.test", SECRET), await attemptLogin(d, "admin@apex.test", `${SECRET}x`), await attemptLogin(d, "cliente@exemplo.com", SECRET)];
    expect(JSON.stringify(results)).not.toContain("Secreta");
    expect(logs.join("\n")).not.toContain("Secreta");
  });
});
