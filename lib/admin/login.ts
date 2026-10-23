// Login do painel por E-MAIL e SENHA (sem link, sem código). A lógica fica aqui, pura e com as dependências injetadas,
// para testar sem Supabase: senha errada, e-mail que não é admin, limite de tentativas e atraso crescente.
// A senha só existe como argumento desta função: não é gravada, nem registrada em log, nem devolvida em mensagem.
import { z } from "zod";

export const LOGIN_ERROR = "E-mail ou senha incorretos.";
export const LOGIN_DENIED = "Acesso negado: este e-mail não tem permissão para o painel.";
export const LOGIN_BLOCKED = "Muitas tentativas. Tente de novo em alguns minutos.";

export type LoginResult = { status: "ok" } | { status: "error"; message: string };

export type LoginDeps = {
  /** true = pode tentar. Conta a tentativa. `ip` = por IP do pedido; `email` = pelo e-mail informado. */
  allow(bucket: "admin-login-ip" | "admin-login-email", key?: string): Promise<boolean>;
  /** Registra uma falha desse e-mail e devolve quantas houve na janela (inclui esta). */
  recordFailure(email: string): Promise<number>;
  /** Tenta entrar. Devolve o e-mail da sessão aberta, ou null se o Supabase recusou. */
  signIn(email: string, password: string): Promise<string | null>;
  /** O e-mail da sessão está em ADMIN_EMAILS? */
  isAdminEmail(email: string): boolean;
  /** O banco também reconhece essa sessão como admin (admin_emails, is_admin())? */
  isAdminInDatabase(): Promise<boolean>;
  signOut(): Promise<void>;
  sleep(ms: number): Promise<void>;
};

/** Atraso depois da n-ésima falha: 0,5 s, 1 s, 2 s, 4 s e no máximo 8 s. */
export const failureDelayMs = (failures: number) => Math.min(500 * 2 ** (Math.max(failures, 1) - 1), 8000);

const input = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function attemptLogin(deps: LoginDeps, rawEmail: unknown, rawPassword: unknown): Promise<LoginResult> {
  const parsed = input.safeParse({ email: String(rawEmail ?? "").trim().toLowerCase(), password: String(rawPassword ?? "") });
  // Formato inválido recebe a MESMA mensagem: não revela o que está errado.
  if (!parsed.success) return { status: "error", message: LOGIN_ERROR };
  const { email, password } = parsed.data;

  if (!(await deps.allow("admin-login-ip")) || !(await deps.allow("admin-login-email", email))) {
    return { status: "error", message: LOGIN_BLOCKED };
  }

  const sessionEmail = await deps.signIn(email, password);
  if (!sessionEmail) {
    const failures = await deps.recordFailure(email);
    await deps.sleep(failureDelayMs(failures));
    return { status: "error", message: LOGIN_ERROR };
  }

  // Senha certa, mas só entra quem está nas DUAS listas (ADMIN_EMAILS e admin_emails): senão, encerra a sessão.
  if (!deps.isAdminEmail(sessionEmail) || !(await deps.isAdminInDatabase())) {
    await deps.signOut();
    return { status: "error", message: LOGIN_DENIED };
  }
  return { status: "ok" };
}
