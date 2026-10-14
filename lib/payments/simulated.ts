import type { PaymentProvider, PaymentRequest, PaymentResult } from "./types";

// Provedor SIMULADO: não cobra nada e não chama serviço externo. Aprova cartão na hora; Pix e boleto ficam
// "pendentes" com instruções fictícias. Serve para testar o fluxo completo da loja.
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = "simulado";

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    const reference = `SIM-${request.orderId}`;
    if (request.method === "cartao") return { ok: true, status: "approved", provider: this.name, reference };
    if (request.method === "pix")
      return {
        ok: true,
        status: "pending",
        provider: this.name,
        reference,
        instructions: "Pagamento simulado: em produção, aqui apareceriam o QR Code e o código Pix copia e cola.",
      };
    return {
      ok: true,
      status: "pending",
      provider: this.name,
      reference,
      instructions: "Pagamento simulado: em produção, aqui apareceriam a linha digitável e o PDF do boleto.",
    };
  }
}
