import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/checkout/order";
import { ORDER_EMAIL_TYPES } from "./types";
import { orderEmail } from "./templates";
import { maskEmail, ResendEmailProvider } from "./providers";

const order: Order = {
  id: "APX-1",
  createdAt: "2026-10-23T12:00:00Z",
  status: "aguardando-pagamento",
  customer: { name: "Maria <b>Silva</b>", email: "maria@exemplo.com" },
  address: { street: "Rua Secreta", number: "1", district: "Centro", city: "São Paulo", state: "SP", cep: "01000000" },
  shipping: { id: "economica", label: "Econômica", days: "Chega em 3 a 6 dias úteis", priceCents: 0 },
  payment: { method: "pix", provider: "simulado", reference: "x" },
  lines: [{ sku: "A", slug: "a", name: "Jaqueta", size: "M", image: "", unitPriceCents: 10000, quantity: 2 }],
  subtotalCents: 20000,
  coupon: { code: "DEZ", discountCents: 2000, shippingDiscountCents: 0 },
  totalCents: 18000,
  tracking: { code: "BR123" },
  simulated: false,
  accessToken: "00000000-0000-0000-0000-000000000000",
};

describe("modelos de e-mail", () => {
  it("os 4 tipos têm assunto, link com a chave e total; HTML escapado; sem endereço", () => {
    for (const type of ORDER_EMAIL_TYPES) {
      const email = orderEmail(type, order, "https://loja.exemplo");
      expect(email.subject).toContain("APX-1");
      expect(email.html).toContain("https://loja.exemplo/pedido/APX-1?t=00000000-0000-0000-0000-000000000000");
      expect(email.text).toContain("Total: R$");
      expect(email.html).not.toContain("<b>Silva</b>");
      expect(email.html + email.text).not.toContain("Rua Secreta");
    }
    expect(orderEmail("enviado", order, "https://loja.exemplo").text).toContain("BR123");
    expect(orderEmail("pedido-recebido", order, "https://loja.exemplo").text).toContain("Cupom DEZ: −R$");
  });

  it("log mascara o e-mail", () => {
    expect(maskEmail("maria@exemplo.com")).toBe("m***@exemplo.com");
  });

  it("Resend: chave só no cabeçalho, erro sem vazar corpo", async () => {
    const calls: RequestInit[] = [];
    const ok = new ResendEmailProvider("re_teste", "Loja <loja@exemplo.com>", (async (_url: string, init: RequestInit) => {
      calls.push(init);
      return new Response(JSON.stringify({ id: "e1" }), { status: 200 });
    }) as unknown as typeof fetch);
    expect(await ok.send({ to: "a@b.co", subject: "s", html: "h", text: "t" })).toEqual({ ok: true, id: "e1" });
    expect((calls[0].headers as Record<string, string>).Authorization).toBe("Bearer re_teste");
    expect(String(calls[0].body)).not.toContain("re_teste");
    const fail = new ResendEmailProvider("k", "f", (async () => new Response(JSON.stringify({ name: "validation_error" }), { status: 422 })) as unknown as typeof fetch);
    expect(await fail.send({ to: "a@b.co", subject: "s", html: "h", text: "t" })).toEqual({ ok: false, error: "HTTP 422 validation_error" });
  });
});
