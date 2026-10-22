// Variáveis que o painel /admin precisa (feat/carros A4). Só NOMES e se estão definidas: o valor nunca sai daqui
// (nem para a página, nem para o log). As NEXT_PUBLIC_ são copiadas para o código no BUILD: depois de criar ou mudar,
// só valem com um novo deploy.
export const ADMIN_ENV = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", why: "endereço do projeto Supabase (catálogo e login)" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", why: "chave pública do Supabase" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", why: "chave secreta do servidor (pedidos e estoque)" },
  { name: "ADMIN_EMAILS", why: "e-mails que podem entrar no painel" },
  { name: "NEXT_PUBLIC_SITE_URL", why: "endereço do site (volta do link mágico)" },
] as const;

export type EnvStatus = { name: string; why: string; set: boolean; public: boolean };

/** ✓/✗ de cada variável. `env` é injetável para teste; o padrão lê process.env (as NEXT_PUBLIC_ uma a uma, como o build exige). */
export function adminEnvStatus(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
): EnvStatus[] {
  return ADMIN_ENV.map(({ name, why }) => ({ name, why, set: Boolean(env[name]?.trim()), public: name.startsWith("NEXT_PUBLIC_") }));
}

export const ROTEIRO_TESTE_ADMIN = "https://github.com/Rafael-Rezende-code/Projeto-F1/blob/main/docs/backend/roteiro-teste-admin.md";
