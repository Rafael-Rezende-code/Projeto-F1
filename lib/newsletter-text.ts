import { BRAND } from "@/lib/brand";

// Textos da newsletter (sem dependência de servidor: o formulário do navegador também importa daqui).
/** Texto do consentimento (rótulo da caixa). Vai gravado junto com a inscrição (prova do que a pessoa aceitou). */
export const NEWSLETTER_CONSENT_LABEL = `Quero receber novidades e lançamentos da ${BRAND.name} por e-mail.`;
/** Frase de finalidade, mostrada abaixo do campo. Só diz para que o e-mail é usado. */
export const NEWSLETTER_PURPOSE = `Usaremos seu e-mail somente para enviar novidades e lançamentos da ${BRAND.name}.`;
/** O que se grava em consent_text: o rótulo e a finalidade que o visitante viu. */
export const NEWSLETTER_CONSENT_TEXT = `${NEWSLETTER_CONSENT_LABEL} ${NEWSLETTER_PURPOSE}`;
