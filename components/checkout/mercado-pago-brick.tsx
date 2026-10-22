"use client";

import { useMemo } from "react";
import { getPaymentMethods, initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { BRICK_PAYMENT_METHODS } from "@/lib/payments/brick";
import type { CardDisplay } from "@/lib/payments/types";

export type BrickSubmit = { selectedPaymentMethod: string; formData: unknown; lastFourDigits?: string };

// Payment Brick OFICIAL do Mercado Pago (fase 10): Pix, cartão de crédito com parcelas e boleto. Os dados do cartão
// (número, validade, CVV) só existem dentro do iframe do Mercado Pago; ele devolve um TOKEN que vai para o servidor.
// O Brick pede o CPF quando o meio exige (boleto, cartão). Carregado só quando o Mercado Pago está configurado
// (next/dynamic em checkout-form.tsx), para não pesar no checkout simulado.
export default function MercadoPagoBrick({
  publicKey,
  amountCents,
  email,
  onCard,
  onSubmit,
}: {
  publicKey: string;
  amountCents: number;
  email: string;
  /** Bandeira (pelo BIN digitado) e, no envio, últimos 4 dígitos: para o cartão decorativo. */
  onCard: (display: CardDisplay) => void;
  /** Resolve para o Brick encerrar; rejeita para ele continuar editável (ex.: recusado, falta aceitar os termos). */
  onSubmit: (data: BrickSubmit) => Promise<void>;
}) {
  // Inicializa o SDK antes do primeiro render do Brick (uma vez por chave).
  useMemo(() => initMercadoPago(publicKey, { locale: "pt-BR" }), [publicKey]);
  const initialization = useMemo(() => ({ amount: amountCents / 100, payer: { email } }), [amountCents, email]);
  const customization = useMemo(
    () => ({ paymentMethods: BRICK_PAYMENT_METHODS, visual: { style: { theme: "default" as const, customVariables: { baseColor: "#b94f01" } } } }),
    [],
  );

  return (
    <Payment
      initialization={initialization}
      customization={customization}
      locale="pt-BR"
      onBinChange={async (bin) => {
        if (!bin) return onCard({});
        try {
          const methods = await getPaymentMethods({ bin });
          const method = methods?.results?.[0];
          onCard({ brand: method?.name ?? method?.id });
        } catch {
          onCard({});
        }
      }}
      onSubmit={async ({ selectedPaymentMethod, formData }, additional) => {
        if (additional?.lastFourDigits) onCard({ last4: additional.lastFourDigits });
        await onSubmit({ selectedPaymentMethod, formData, lastFourDigits: additional?.lastFourDigits });
      }}
      onError={(error) => console.error("[Payment Brick]", error)}
    />
  );
}
