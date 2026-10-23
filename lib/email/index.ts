import { ConsoleEmailProvider, ResendEmailProvider } from "./providers";
import type { EmailProvider } from "./types";

// Provedor de e-mail: Resend quando RESEND_API_KEY e EMAIL_FROM existem; senão, o de console (nada sai). Guia em
// docs/backend/email.md. As variáveis são lidas a cada chamada (só no servidor).
export const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export function getEmailProvider(): EmailProvider {
  return isEmailConfigured() ? new ResendEmailProvider(process.env.RESEND_API_KEY!, process.env.EMAIL_FROM!) : new ConsoleEmailProvider();
}

export type { EmailMessage, EmailProvider, EmailResult, OrderEmailType } from "./types";
