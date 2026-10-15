import { BRAND } from "@/lib/brand";
// Dados gerais do site (URL de produção usada em metadata, sitemap e JSON-LD).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://apex-seven-ruddy.vercel.app";
export const SITE_NAME = BRAND.name;
export const SITE_DESCRIPTION = BRAND.description;
