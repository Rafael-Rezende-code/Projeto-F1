// Peças puras do scripts/supabase/ativar.ts (testadas em supabase/tests/ativar-lib.test.ts): leitura do .env.local e
// a máscara que impede qualquer chave de sair no relatório.
import { readFileSync } from "node:fs";

/** Lê CHAVE=valor (aspas opcionais, `export`, comentários com #). */
export function parseEnv(text: string) {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}
export const loadEnvFile = (file: string) => parseEnv(readFileSync(file, "utf8"));

const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const NEW_KEYS = /\b(sb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}|sbp_[A-Za-z0-9]{16,})\b/g;
/** Valores de variáveis com KEY/SECRET/TOKEN/PASSWORD no nome (para esconder tal e qual na saída). */
export const secretsFrom = (env: Record<string, string>) => Object.entries(env).filter(([name, value]) => /KEY|SECRET|TOKEN|PASSWORD/i.test(name) && value).map(([, value]) => value);

/** Esconde os valores secretos conhecidos e qualquer coisa com cara de chave (JWT, sb_secret_..., sbp_...). */
export function createMask(secrets: Iterable<string>) {
  const known = [...secrets].filter((secret) => secret.length >= 8);
  return (text: string) => {
    let out = String(text);
    for (const secret of known) out = out.split(secret).join("«oculto»");
    return out.replace(JWT, "«chave oculta»").replace(NEW_KEYS, "«chave oculta»");
  };
}

/** Papel (role) de uma chave no formato JWT, ou null (chaves novas sb_... não são JWT). */
export function jwtRole(key: string) {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    return (JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export const maskEmail = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");
