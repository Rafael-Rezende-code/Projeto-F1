import { BRAND } from "@/lib/brand";
import { launchLabel, type Drop } from "@/lib/drops";

// E-mail "o drop foi lançado" para a lista de espera (loja extra, item 6). Puro (teste em lib/admin/drop-schema.test.ts).
const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function dropWaitlistEmail(drop: Pick<Drop, "title" | "slug" | "launchAt">, siteUrl: string) {
  const link = new URL(`/drops/${drop.slug}`, siteUrl).toString();
  const subject = `${drop.title} foi lançado`;
  const text = [`${drop.title} foi lançado (${launchLabel(drop.launchAt)}, horário de Brasília).`, "", `Veja as peças: ${link}`, "", `Você recebeu este aviso porque pediu na lista de espera da ${BRAND.name}. É um aviso único.`].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f5f5f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b94f01">Drop lançado</p>
<h1 style="margin:0 0 12px;font-size:28px;line-height:1.1">${escape(drop.title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#444">Lançado ${escape(launchLabel(drop.launchAt))} (horário de Brasília). As peças já podem ser compradas, enquanto houver estoque.</p>
<a href="${escape(link)}" style="display:inline-block;background:#b94f01;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:14px">Ver as peças</a>
<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#666">Você recebeu este aviso porque pediu na lista de espera da ${escape(BRAND.name)}. É um aviso único.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
