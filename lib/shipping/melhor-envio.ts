import "server-only";
import { MELHOR_ENVIO, ORIGIN_CEP } from "./config";
import { melhorEnvioBody, parseMelhorEnvio, type MelhorEnvioService } from "./melhor-envio-core";
import type { ShippingProvider, ShippingQuoteRequest } from "./types";

// Melhor Envio (pronto, DESLIGADO sem MELHOR_ENVIO_TOKEN). Cotação por CEP, peso e medidas. Só no servidor: o token
// nunca vai para o cliente. Falha ou demora (> 8 s) → erro; quem chama cai no frete simulado.
export class MelhorEnvioProvider implements ShippingProvider {
  readonly id = "melhorenvio";
  async quote(request: ShippingQuoteRequest) {
    const response = await fetch(`${MELHOR_ENVIO.baseUrl}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${MELHOR_ENVIO.token}`,
        "User-Agent": MELHOR_ENVIO.userAgent,
      },
      body: JSON.stringify(melhorEnvioBody(request, ORIGIN_CEP, MELHOR_ENVIO.insurance)),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Melhor Envio: HTTP ${response.status}`);
    return parseMelhorEnvio((await response.json()) as MelhorEnvioService[], MELHOR_ENVIO.services);
  }
}
