// Redes sociais da loja: URLs lidas de variáveis de ambiente. Sem a URL, o ícone NÃO aparece (nada de link falso).
//
//   NEXT_PUBLIC_SOCIAL_INSTAGRAM   ex.: https://www.instagram.com/sualoja
//   NEXT_PUBLIC_SOCIAL_TIKTOK      ex.: https://www.tiktok.com/@sualoja
//   NEXT_PUBLIC_SOCIAL_YOUTUBE     ex.: https://www.youtube.com/@sualoja
//
// Só endereços https:// válidos entram (os outros são ignorados). NEXT_PUBLIC_*: lidas no build (mudou? novo deploy).

export type SocialNetwork = "instagram" | "tiktok" | "youtube";
export type SocialLink = { network: SocialNetwork; label: string; href: string };

type Env = Record<string, string | undefined>;

const httpsUrl = (value: string | undefined) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
};

export function createSocialLinks(env: Env): SocialLink[] {
  const entries: [SocialNetwork, string, string | undefined][] = [
    ["instagram", "Instagram", env.NEXT_PUBLIC_SOCIAL_INSTAGRAM],
    ["tiktok", "TikTok", env.NEXT_PUBLIC_SOCIAL_TIKTOK],
    ["youtube", "YouTube", env.NEXT_PUBLIC_SOCIAL_YOUTUBE],
  ];
  return entries.flatMap(([network, label, value]) => {
    const href = httpsUrl(value);
    return href ? [{ network, label, href }] : [];
  });
}

// As leituras de process.env.NEXT_PUBLIC_* precisam ser LITERAIS para o Next trocar o valor no build.
export const socialLinks: SocialLink[] = createSocialLinks({
  NEXT_PUBLIC_SOCIAL_INSTAGRAM: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
  NEXT_PUBLIC_SOCIAL_TIKTOK: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK,
  NEXT_PUBLIC_SOCIAL_YOUTUBE: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
});
