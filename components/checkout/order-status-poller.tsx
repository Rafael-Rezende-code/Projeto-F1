"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Pedido gravado aguardando Pix/boleto/análise: recarrega os dados do servidor a cada 8 s (até 15 min) para a página
// mudar sozinha quando o webhook confirmar o pagamento. Pausa com a aba escondida.
export function OrderStatusPoller() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > 15 * 60_000) return window.clearInterval(timer);
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
