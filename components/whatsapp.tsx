"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { whatsappLink, whatsappNumber } from "@/lib/social";
import { whatsappMessages } from "@/lib/store-policy";
import { SITE_URL } from "@/lib/site";

// WhatsApp da loja (operação, fase 1a). Só existe com NEXT_PUBLIC_WHATSAPP_NUMBER (lib/social.ts).
// O botão flutuante fica no layout raiz; a página de produto e a do pedido dizem o "assunto" com <WhatsAppTopic>, e a
// mensagem pré-preenchida passa a citar o produto (nome + link) ou o número do pedido. No resto, a mensagem geral.
type Topic = { product?: { name: string; slug: string }; order?: string } | null;

let topic: Topic = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setTopic = (next: Topic) => {
  topic = next;
  listeners.forEach((listener) => listener());
};

export function messageFor(current: Topic) {
  if (current?.product) return whatsappMessages.product(current.product.name, `${SITE_URL}/produtos/${current.product.slug}`);
  if (current?.order) return whatsappMessages.order(current.order);
  return whatsappMessages.generic();
}

/** Diz ao botão do WhatsApp sobre o que é a página (produto ou pedido). Não renderiza nada. */
export function WhatsAppTopic({ product, order }: { product?: { name: string; slug: string }; order?: string }) {
  const key = product ? `p:${product.slug}` : order ? `o:${order}` : "";
  useEffect(() => {
    setTopic(product ? { product } : order ? { order } : null);
    return () => setTopic(null);
    // a chave cobre o conteúdo do assunto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

/**
 * Botão discreto: desktop no canto inferior direito; celular à direita, acima do dock e da barra fixa de compra
 * (a barra marca [data-buy-bar]; o CSS .whatsapp-fab sobe junto, sem JS). Fora do /admin.
 */
export function WhatsAppButton() {
  const current = useSyncExternalStore(subscribe, () => topic, () => null);
  const pathname = usePathname();
  if (!whatsappNumber || pathname?.startsWith("/admin")) return null;
  const href = whatsappLink(messageFor(current))!;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a loja no WhatsApp (abre em nova aba)"
      className="whatsapp-fab fixed right-4 z-[60] flex size-11 items-center justify-center rounded-xl bg-black text-white shadow-lg ring-1 ring-white/20 transition hover:bg-[#b94f01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:right-6 md:size-12"
    >
      <MessageCircle size={20} strokeWidth={1.8} aria-hidden="true" />
    </a>
  );
}
