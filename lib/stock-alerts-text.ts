import { BRAND } from "@/lib/brand";

// Textos do "Avise-me quando chegar" (sem dependência de servidor: o formulário do navegador importa daqui).
/** Rótulo da caixa de consentimento. Vai gravado junto com o pedido de aviso. */
export const STOCK_ALERT_CONSENT_LABEL = "Quero receber um e-mail quando este tamanho voltar ao estoque.";
/** Frase de finalidade, curta, abaixo do campo. */
export const STOCK_ALERT_PURPOSE = `Usaremos seu e-mail só para este aviso. A ${BRAND.name} não envia outras mensagens por causa dele.`;
export const STOCK_ALERT_CONSENT_TEXT = `${STOCK_ALERT_CONSENT_LABEL} ${STOCK_ALERT_PURPOSE}`;
