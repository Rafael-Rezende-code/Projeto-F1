import type { EmailMessage, EmailProvider, EmailResult } from "./types";

/** "maria@exemplo.com" → "m***@exemplo.com" (log sem o endereço inteiro). */
export const maskEmail = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, "$1***$2");

// Desenvolvimento / sem chave: não envia nada, só registra no log do servidor o assunto e o destinatário mascarado.
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console" as const;
  async send(message: EmailMessage): Promise<EmailResult> {
    console.info(`[e-mail simulado] para ${maskEmail(message.to)}: ${message.subject}`);
    return { ok: true };
  }
}

// Resend (https://resend.com): POST /emails com a chave no cabeçalho. Sem SDK (o contrato é pequeno). Timeout de 8 s.
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend" as const;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await this.fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}${body.name ? ` ${body.name}` : ""}` };
      return { ok: true, id: body.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.name : "erro de rede" };
    }
  }
}
