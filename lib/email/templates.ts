import { personalizationLabel } from "@/lib/personalization";
import { BRAND } from "@/lib/brand";
import { orderUrl, PAYMENT_LABELS, type Order } from "@/lib/checkout/order";
import { formatPrice } from "@/lib/format";
import type { OrderEmailType } from "./types";

// Modelos dos e-mails do pedido (operação, fase 3): puro, HTML simples em tabela com estilos inline (lido em qualquer
// cliente de e-mail) + versão em texto. Nada de dado sensível: sem CPF, sem cartão (no máximo bandeira e final, que já
// aparecem na página do pedido). Testes em templates.test.ts.
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

type Copy = { subject: string; heading: string; intro: string[] };

function copyFor(type: OrderEmailType, order: Order): Copy {
  const first = order.customer.name.trim().split(/\s+/)[0] || "Olá";
  switch (type) {
    case "pedido-recebido":
      return {
        subject: `Recebemos seu pedido ${order.id}`,
        heading: "Pedido recebido.",
        intro: [
          `${first}, seu pedido está no grid.`,
          order.payment.method === "cartao"
            ? "O pagamento está em análise. Avisamos por aqui assim que for aprovado."
            : `Falta só o pagamento (${PAYMENT_LABELS[order.payment.method]}). O ${order.payment.method === "pix" ? "código Pix" : "boleto"} está na página do pedido.`,
        ],
      };
    case "pagamento-aprovado":
      return {
        subject: `Pagamento aprovado: pedido ${order.id}`,
        heading: "Pagamento aprovado.",
        intro: [`${first}, seu pagamento foi aprovado e o pedido entrou em preparação.`, "Quando ele sair, mandamos o código de rastreio."],
      };
    case "enviado":
      return {
        subject: `Seu pedido ${order.id} está a caminho`,
        heading: "Pedido a caminho.",
        intro: [`${first}, seu pedido saiu para entrega.`, order.tracking ? `Código de rastreio: ${order.tracking.code}` : "O código de rastreio está na página do pedido."],
      };
    case "cancelado":
      return {
        subject: `Pedido ${order.id} cancelado`,
        heading: "Pedido cancelado.",
        intro: [`${first}, o pedido ${order.id} foi cancelado.`, "Se tiver alguma dúvida, é só responder este e-mail."],
      };
  }
}

export function orderEmail(type: OrderEmailType, order: Order, siteUrl: string) {
  const copy = copyFor(type, order);
  const link = new URL(orderUrl(order), siteUrl).toString();
  const lines = order.lines.map((line) => ({
    label: `${line.name} · Tam. ${line.size} · Qtd. ${line.quantity}${line.personalization ? ` · ${personalizationLabel(line.personalization)}` : ""}`,
    price: formatPrice((line.unitPriceCents + (line.feeCents ?? 0)) * line.quantity),
  }));
  const totals = [
    ["Subtotal", formatPrice(order.subtotalCents)],
    ...(order.coupon && order.coupon.discountCents > 0 ? [[`Cupom ${order.coupon.code}`, `−${formatPrice(order.coupon.discountCents)}`]] : []),
    ...(order.kitDiscount?.kits ?? []).map((kit) => [kit.title, `−${formatPrice(kit.discountCents)}`]),
    ...(order.paymentDiscount ? [[`Desconto no Pix (${order.paymentDiscount.percent}%)`, `−${formatPrice(order.paymentDiscount.cents)}`]] : []),
    ["Entrega", order.shipping.priceCents === 0 ? "Grátis" : formatPrice(order.shipping.priceCents)],
    ["Total", formatPrice(order.totalCents)],
  ];

  const text = [
    copy.heading,
    "",
    ...copy.intro,
    "",
    `Pedido ${order.id}`,
    ...lines.map((line) => `- ${line.label}: ${line.price}`),
    ...totals.map(([label, value]) => `${label}: ${value}`),
    `Entrega: ${order.shipping.label} · ${order.shipping.days}`,
    "",
    `Acompanhe: ${link}`,
    "",
    `${BRAND.name}${BRAND.mark}`,
  ].join("\n");

  const cell = "padding:6px 0;font-size:14px;line-height:20px;color:#111111;";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(copy.subject)}</title></head>
<body style="margin:0;background:#f5f5f3;font-family:Helvetica,Arial,sans-serif;color:#111111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px 28px;">
<tr><td style="font-family:Georgia,serif;font-style:italic;font-size:24px;">${escape(BRAND.name)}<span style="color:${BRAND.accent};">${escape(BRAND.mark)}</span></td></tr>
<tr><td style="padding-top:24px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.accent};font-weight:bold;">Pedido ${escape(order.id)}</td></tr>
<tr><td style="padding-top:8px;font-size:28px;line-height:32px;font-weight:bold;">${escape(copy.heading)}</td></tr>
${copy.intro.map((paragraph) => `<tr><td style="padding-top:12px;font-size:15px;line-height:22px;color:#333333;">${escape(paragraph)}</td></tr>`).join("\n")}
<tr><td style="padding-top:24px;"><a href="${escape(link)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:12px;">Ver meu pedido</a></td></tr>
<tr><td style="padding-top:28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e5e5;">
${lines.map((line) => `<tr><td style="${cell}">${escape(line.label)}</td><td align="right" style="${cell}white-space:nowrap;padding-left:12px;vertical-align:top;">${escape(line.price)}</td></tr>`).join("\n")}
${totals.map(([label, value], i) => `<tr><td style="${cell}${i === totals.length - 1 ? "font-weight:bold;border-top:1px solid #e5e5e5;" : "color:#555555;"}">${escape(label)}</td><td align="right" style="${cell}${i === totals.length - 1 ? "font-weight:bold;border-top:1px solid #e5e5e5;" : ""}">${escape(value)}</td></tr>`).join("\n")}
</table></td></tr>
<tr><td style="padding-top:12px;font-size:13px;line-height:20px;color:#555555;">Entrega: ${escape(order.shipping.label)} · ${escape(order.shipping.days)}</td></tr>
<tr><td style="padding-top:28px;font-size:12px;line-height:18px;color:#666666;">Você recebeu este e-mail por causa de uma compra na ${escape(BRAND.name)}. Se não reconhece este pedido, responda esta mensagem.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: copy.subject, html, text };
}
