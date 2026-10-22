import { NextResponse, type NextRequest } from "next/server";
import { handleWebhook } from "@/lib/payments/mercado-pago-core";
import { fetchMercadoPagoPayment, mercadoPagoConfigured } from "@/lib/payments/mercado-pago";
import { hasPaymentEvent, recordPayment, savePaymentEvent } from "@/lib/orders/store";
import { isOrderStoreConfigured } from "@/lib/supabase/config";

// Webhook do Mercado Pago (fase 10). Configure no painel: Suas integrações → aplicação → Webhooks → URL
// https://<seu-dominio>/api/webhooks/mercadopago, evento "Pagamentos", e copie a assinatura secreta para
// MP_WEBHOOK_SECRET. Valida a assinatura, busca o pagamento na API (nunca confia no corpo), atualiza o pedido no banco
// e é idempotente (payment_events). Lógica testada em lib/payments/mercado-pago-core.test.ts.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!mercadoPagoConfigured() || !process.env.MP_WEBHOOK_SECRET) return NextResponse.json({ ok: false, note: "Mercado Pago não configurado" }, { status: 404 });
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  try {
    const stored = isOrderStoreConfigured();
    const result = await handleWebhook(
      { searchParams: request.nextUrl.searchParams, headers: request.headers, body },
      {
        secret: process.env.MP_WEBHOOK_SECRET,
        fetchPayment: fetchMercadoPagoPayment,
        // Sem banco não há pedido para atualizar: só confirma o recebimento.
        hasEvent: stored ? hasPaymentEvent : async () => false,
        saveEvent: stored ? savePaymentEvent : async () => {},
        recordPayment: stored
          ? (orderId, payment) => recordPayment(orderId, { provider: "mercadopago", reference: payment.reference, providerStatus: payment.providerStatus, details: payment.details })
          : async () => null,
      },
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[webhook mercadopago]", error);
    return NextResponse.json({ ok: false }, { status: 500 }); // o Mercado Pago tenta de novo
  }
}
