import type { Order } from "@/lib/checkout/order";

// Partes do Payment Brick (Mercado Pago) usadas no NAVEGADOR e no servidor (sem dependências de Node).

/** Meios habilitados no Brick: Pix, cartão de crédito (com parcelas) e boleto. */
export const BRICK_PAYMENT_METHODS = { creditCard: "all", bankTransfer: "all", ticket: "all", maxInstallments: 12 } as const;

/** Meio do Brick (selectedPaymentMethod) → meio do pedido. Só os 3 habilitados na loja. */
export function methodFromBrick(selected: string): Order["payment"]["method"] | null {
  if (selected === "creditCard") return "cartao";
  if (selected === "bank_transfer") return "pix";
  if (selected === "ticket") return "boleto";
  return null;
}
