// Mensagens das funções de pedido do banco (cancel_order, mark_order_refunded) para o painel. Puro (testes em
// order-actions.test.ts).
const MESSAGES: Record<string, string> = {
  SEM_PERMISSAO: "Sem permissão para esta ação.",
  MOTIVO_OBRIGATORIO: "Escreva o motivo do cancelamento (3 a 500 caracteres).",
  CONFIRMAR_ENVIADO: "Este pedido já foi enviado: marque a confirmação para cancelar mesmo assim.",
  PEDIDO_INEXISTENTE: "Pedido não encontrado.",
  SO_CANCELADO: "Só pedidos cancelados podem ser marcados como reembolsados.",
  NOTA_OBRIGATORIA: "Descreva o reembolso (3 a 500 caracteres): meio, valor, data.",
};

export function orderActionMessage(error: { message?: string } | null | undefined) {
  const code = Object.keys(MESSAGES).find((key) => error?.message?.includes(key));
  return code ? MESSAGES[code] : "Não foi possível concluir agora. Tente de novo.";
}

/** Status que podem ser cancelados no painel (cancelado já está; os demais sim, enviado/entregue com confirmação). */
export const canCancel = (status: string) => status !== "cancelado";
export const needsShippedConfirmation = (status: string) => status === "enviado" || status === "entregue";
