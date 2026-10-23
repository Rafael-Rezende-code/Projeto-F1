// E-mail transacional (operação, fase 3). A loja só fala com esta interface; lib/email/index.ts escolhe o provedor.
export type EmailMessage = { to: string; subject: string; html: string; text: string; replyTo?: string };
export type EmailResult = { ok: true; id?: string } | { ok: false; error: string };

export interface EmailProvider {
  readonly name: "resend" | "console";
  send(message: EmailMessage): Promise<EmailResult>;
}

export const ORDER_EMAIL_TYPES = ["pedido-recebido", "pagamento-aprovado", "enviado", "cancelado"] as const;
export type OrderEmailType = (typeof ORDER_EMAIL_TYPES)[number];
