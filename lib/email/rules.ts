import type { OrderStatus } from "@/lib/checkout/order";
import type { OrderEmailType } from "./types";

/** Que e-mail sai numa mudança de status (puro; testes em rules.test.ts). Recusado não gera e-mail: o cliente vê na hora. */
export function emailsForStatusChange(previous: OrderStatus | null | undefined, next: OrderStatus): OrderEmailType[] {
  if (previous === next) return [];
  if (next === "pago" && previous !== "enviado" && previous !== "entregue") return ["pagamento-aprovado"];
  if (next === "enviado") return ["enviado"];
  if (next === "cancelado") return ["cancelado"];
  return [];
}
