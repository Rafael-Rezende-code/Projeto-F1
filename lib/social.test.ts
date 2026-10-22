import { describe, expect, it } from "vitest";
import { createSocialLinks } from "./social";

describe("redes sociais (lib/social.ts)", () => {
  it("sem URL, nenhum ícone", () => {
    expect(createSocialLinks({})).toEqual([]);
    expect(createSocialLinks({ NEXT_PUBLIC_SOCIAL_INSTAGRAM: "   ", NEXT_PUBLIC_SOCIAL_TIKTOK: "" })).toEqual([]);
  });

  it("só aparecem as redes configuradas, na ordem Instagram, TikTok, YouTube", () => {
    const links = createSocialLinks({ NEXT_PUBLIC_SOCIAL_YOUTUBE: "https://www.youtube.com/@apex", NEXT_PUBLIC_SOCIAL_INSTAGRAM: "https://www.instagram.com/apex" });
    expect(links.map((link) => link.network)).toEqual(["instagram", "youtube"]);
    expect(links[0]).toMatchObject({ label: "Instagram", href: "https://www.instagram.com/apex" });
  });

  it("recusa o que não é um endereço https válido (http, javascript:, sem domínio, lixo)", () => {
    expect(createSocialLinks({ NEXT_PUBLIC_SOCIAL_INSTAGRAM: "http://instagram.com/x", NEXT_PUBLIC_SOCIAL_TIKTOK: "javascript:alert(1)", NEXT_PUBLIC_SOCIAL_YOUTUBE: "youtube" })).toEqual([]);
    expect(createSocialLinks({ NEXT_PUBLIC_SOCIAL_INSTAGRAM: "https://localhost/x" })).toEqual([]);
  });
});
