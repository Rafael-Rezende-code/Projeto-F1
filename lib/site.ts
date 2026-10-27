import { BRAND } from "@/lib/brand";

// Dados gerais do site (URL usada em metadata, sitemap, JSON-LD e links de e-mail).
// Ordem: NEXT_PUBLIC_SITE_URL (defina em Production com o domínio da loja) → na Vercel, Preview usa a URL estável da
// branch (VERCEL_BRANCH_URL; cada branch tem a sua, sem variável presa a uma branch) e Production o domínio do projeto
// (VERCEL_PROJECT_PRODUCTION_URL) → o endereço atual da Vercel. Variáveis de sistema da Vercel; sem elas (local), o padrão.
type Env = Record<string, string | undefined>;
export function resolveSiteUrl(env: Env) {
  const https = (host?: string) => (host ? `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : undefined);
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const vercelEnv = env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv === "preview") return https(env.VERCEL_BRANCH_URL ?? env.NEXT_PUBLIC_VERCEL_BRANCH_URL ?? env.VERCEL_URL ?? env.NEXT_PUBLIC_VERCEL_URL) ?? "https://apex-seven-ruddy.vercel.app";
  if (vercelEnv === "production") return https(env.VERCEL_PROJECT_PRODUCTION_URL ?? env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ?? "https://apex-seven-ruddy.vercel.app";
  return "https://apex-seven-ruddy.vercel.app";
}

export const SITE_URL = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
});
export const SITE_NAME = BRAND.name;
export const SITE_DESCRIPTION = BRAND.description;
