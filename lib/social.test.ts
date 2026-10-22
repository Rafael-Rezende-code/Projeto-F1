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

describe("WhatsApp", async () => {
  const { parseWhatsAppNumber, whatsappLink } = await import("./social");
  const { createWhatsAppMessages } = await import("./store-policy");
  it("número só com dígitos e código do país; sem número, sem link", () => {
    expect(parseWhatsAppNumber("5535999990000")).toBe("5535999990000");
    expect(parseWhatsAppNumber("+55 35 99999-0000")).toBeNull();
    expect(parseWhatsAppNumber("")).toBeNull();
    expect(whatsappLink("Oi", null)).toBeNull();
  });
  it("link wa.me com a mensagem codificada; mensagens de produto e pedido", () => {
    const messages = createWhatsAppMessages({});
    const link = whatsappLink(messages.product("Boné Ferrari", "https://loja.com/produtos/bone-ferrari"), "5535999990000")!;
    expect(link.startsWith("https://wa.me/5535999990000?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe("Olá! Tenho uma dúvida sobre o produto Boné Ferrari: https://loja.com/produtos/bone-ferrari");
    expect(messages.order("APX-1")).toBe("Olá! Tenho uma dúvida sobre o meu pedido APX-1.");
    expect(createWhatsAppMessages({ NEXT_PUBLIC_WHATSAPP_MESSAGE_ORDER: "Pedido {pedido}, por favor" }).order("APX-2")).toBe("Pedido APX-2, por favor");
  });
});
