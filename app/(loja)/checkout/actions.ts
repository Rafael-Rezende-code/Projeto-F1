"use server";

import { BRAND } from "@/lib/brand";
import { catalog } from "@/lib/catalog";
import { quoteForItems, type QuoteResult } from "@/lib/checkout/quote";
import { addressSchema, checkoutSchema, CPF_REQUIRED_METHODS, fieldErrors, orderItemSchema } from "@/lib/checkout/schema";
import { z } from "zod";
import { newOrderId, type Order, type OrderLine } from "@/lib/checkout/order";
import { cancelStoredOrder, createStoredOrder, recordPayment } from "@/lib/orders/store";
import { queueOrderEmails } from "@/lib/email/order-emails";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit-config";
import { getPaymentProvider } from "@/lib/payments";
import { mercadoPagoConfigured } from "@/lib/payments/mercado-pago";
import { CHECKOUT_BLOCKED_MESSAGE, checkoutModeFor } from "@/lib/checkout-mode";
import { isOrderStoreConfigured } from "@/lib/supabase/config";
import { couponMessage, normalizeCouponCode } from "@/lib/coupons";
import { createPublicClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/validators/br";
import { storePolicy } from "@/lib/store-policy";
import { applyKits, computeTotals, type PriceLine } from "@/lib/pricing";
import { getKits } from "@/lib/kits-store";
import type { Kit } from "@/lib/kits";

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; message: string; errors?: Record<string, string>; stockIssues?: { sku: string; available: number }[] };

const STOCK_MESSAGE = "Alguns itens não têm mais estoque suficiente. Ajuste a sacola e tente de novo.";

// Server action do checkout. Nunca confia no cliente: valida tudo com zod de novo, busca preço e estoque de cada SKU
// no catálogo, recalcula frete e total, e só então chama o provedor de pagamento.
// - Sem Supabase: pedido SIMULADO, não é gravado (ver CLAUDE.md, "Checkout").
// - Com Supabase (fase 9): o pedido é gravado e o estoque baixado numa transação (create_order) ANTES do pagamento; o
//   total cobrado é o calculado pelo banco. Pagamento recusado ou erro do provedor: o pedido é cancelado e o estoque
//   volta. Pix e boleto ficam "aguardando pagamento" até o webhook (fase 10) confirmar.
export type CouponPreview =
  | { ok: true; code: string; discountCents: number; shippingDiscountCents: number }
  | { ok: false; message: string };

/**
 * Prévia do cupom (sacola e checkout). O subtotal vem do CATÁLOGO pelos SKUs e o frete da opção escolhida (cotada de
 * novo no servidor); o banco responde pelo código digitado (quote_coupon). A validação que vale é a da create_order.
 */
export async function previewCoupon(input: unknown): Promise<CouponPreview> {
  if (!isOrderStoreConfigured()) return { ok: false, message: couponMessage("desligado") };
  const parsed = z
    .object({ code: z.string().max(60), items: z.array(orderItemSchema).min(1).max(50), cep: z.string().optional(), shippingId: z.string().max(40).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira o cupom e a sacola." };
  // Limite por IP (lib/rate-limit.ts): impede testar códigos em massa.
  if (!(await allowRequest("cupom"))) return { ok: false, message: RATE_LIMIT_MESSAGE };
  const code = normalizeCouponCode(parsed.data.code);
  if (!code) return { ok: false, message: couponMessage("formato") };
  let subtotalCents = 0;
  let shippingCents = 0;
  // Kit na sacola: o cupom só vale junto se a política permitir; o cupom incide sobre o subtotal depois do kit.
  const priceLines: PriceLine[] = [];
  for (const item of parsed.data.items) {
    const found = await catalog.getVariantBySku(item.sku);
    if (found) priceLines.push({ key: item.sku, sku: item.sku, slug: found.product.slug, unitPriceCents: found.product.priceCents, feeCents: 0, quantity: item.quantity, personalized: false });
  }
  const kitCents = applyKits(priceLines, await getKits()).reduce((sum, kit) => sum + kit.discountCents, 0);
  if (kitCents > 0 && !storePolicy.couponWithKit) return { ok: false, message: couponMessage("com_kit") };
  if (parsed.data.cep && parsed.data.shippingId) {
    const quote = await quoteForItems(parsed.data.cep, parsed.data.items);
    if (!quote.ok) return { ok: false, message: quote.message };
    subtotalCents = quote.subtotalCents;
    shippingCents = quote.options.find((option) => option.id === parsed.data.shippingId)?.priceCents ?? 0;
  } else {
    subtotalCents = priceLines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  }
  subtotalCents -= kitCents;
  const { data, error } = await createPublicClient().rpc("quote_coupon", { p_code: code, p_subtotal_cents: subtotalCents, p_shipping_cents: shippingCents });
  if (error) {
    console.error("[cupom] prévia:", error.code);
    return { ok: false, message: "Não foi possível conferir o cupom agora. Tente de novo." };
  }
  const result = data as { ok: boolean; reason?: string; discount_cents?: number; shipping_discount_cents?: number; code?: string };
  if (!result.ok) return { ok: false, message: couponMessage(result.reason) };
  return { ok: true, code: result.code ?? code, discountCents: result.discount_cents ?? 0, shippingDiscountCents: result.shipping_discount_cents ?? 0 };
}

/** Cotação de frete para a etapa Entrega do checkout (CEP + itens da sacola; preços e pacotes vêm do catálogo). */
export async function quoteShipping(input: unknown): Promise<QuoteResult> {
  const parsed = z.object({ cep: addressSchema.shape.cep, items: z.array(orderItemSchema).min(1).max(50) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira o CEP e a sacola." };
  try {
    return await quoteForItems(parsed.data.cep, parsed.data.items);
  } catch (error) {
    console.error("[frete] cotação:", error);
    return { ok: false, message: "Não foi possível calcular o frete agora. Tente de novo em instantes." };
  }
}

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  // Produção sem provedor de pagamento real: nada é concluído (regra de servidor; lib/checkout-mode.ts).
  if (checkoutModeFor(process.env, mercadoPagoConfigured()) === "bloqueado") return { ok: false, message: CHECKOUT_BLOCKED_MESSAGE };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os dados destacados.", errors: fieldErrors(parsed.error) };
  const data = parsed.data;
  // Limite por IP (lib/rate-limit.ts): pedidos em massa travam estoque e disparam cobranças.
  if (!(await allowRequest("checkout"))) return { ok: false, message: RATE_LIMIT_MESSAGE };

  const lines: OrderLine[] = [];
  const stockIssues: { sku: string; available: number }[] = [];
  for (const item of data.items) {
    const found = await catalog.getVariantBySku(item.sku);
    if (!found || found.variant.stock < item.quantity) {
      stockIssues.push({ sku: item.sku, available: found?.variant.stock ?? 0 });
      continue;
    }
    lines.push({
      sku: item.sku,
      slug: found.product.slug,
      name: found.product.name,
      size: found.variant.size,
      image: found.product.images[0]?.src ?? "",
      unitPriceCents: found.product.priceCents,
      quantity: item.quantity,
      fulfillment: found.product.fulfillment,
      dispatchDays: found.product.dispatchDays,
      status: found.product.fulfillment === "sob_encomenda" ? "aguardando-compra" : "separando",
    });
  }
  if (stockIssues.length) return { ok: false, message: STOCK_MESSAGE, stockIssues };

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  // Frete cotado DE NOVO no servidor (lib/shipping): a opção escolhida precisa existir para este CEP e esta sacola.
  const quote = await quoteForItems(data.address.cep, data.items);
  if (!quote.ok) return { ok: false, message: quote.stockIssues ? STOCK_MESSAGE : quote.message, stockIssues: quote.stockIssues };
  const option = quote.options.find((item) => item.id === data.shipping.shippingId);
  if (!option) return { ok: false, message: "Essa forma de entrega não está mais disponível. Volte à etapa Entrega e escolha de novo.", errors: { "shipping.shippingId": "Escolha de novo." } };
  const shippingCents = option.priceCents;
  const id = newOrderId();
  const shipping = { id: option.id, label: option.label, days: option.days, priceCents: shippingCents };
  const address = {
    street: data.address.street,
    number: data.address.number,
    complement: data.address.complement || undefined,
    district: data.address.district,
    city: data.address.city,
    state: data.address.state,
    cep: data.address.cep,
  };

  // Cupom: só com pedidos gravados (o banco valida e conta o uso). No modo simulado não há cupons.
  const coupon = data.coupon ? normalizeCouponCode(data.coupon) : null;
  if (data.coupon && !coupon) return { ok: false, message: couponMessage("formato"), errors: { coupon: couponMessage("formato") } };
  if (coupon && !isOrderStoreConfigured()) return { ok: false, message: couponMessage("desligado"), errors: { coupon: couponMessage("desligado") } };

  // Pedido gravado (Supabase): reserva o estoque antes de cobrar.
  const stored = isOrderStoreConfigured()
    ? await createStoredOrder({
        id,
        customer: { name: data.contact.name, email: data.contact.email, phone: data.contact.phone },
        address,
        shipping,
        paymentMethod: data.payment.method,
        items: data.items,
        coupon: coupon ?? undefined,
        pixPercent: storePolicy.pixDiscountPercent,
        couponWithKit: storePolicy.couponWithKit,
      })
    : null;
  if (stored && !stored.ok) {
    if ("stockIssues" in stored) return { ok: false, message: STOCK_MESSAGE, stockIssues: stored.stockIssues };
    if ("couponReason" in stored) return { ok: false, message: couponMessage(stored.couponReason), errors: { coupon: couponMessage(stored.couponReason) } };
    console.error("[checkout] create_order:", stored.error);
    return { ok: false, message: "Não foi possível registrar o pedido agora. Tente de novo em instantes." };
  }
  // Simulado: mesma conta do banco (lib/pricing.ts). Gravado: o total é o do banco.
  const simulatedTotals = computeTotals({
    lines: lines.map((line) => ({ key: line.sku, sku: line.sku, slug: line.slug, unitPriceCents: line.unitPriceCents, feeCents: 0, quantity: line.quantity, personalized: false })),
    kits: stored ? [] : await getKits(),
    shippingCents,
    method: data.payment.method,
    pixPercent: storePolicy.pixDiscountPercent,
  });
  const totalCents = stored?.ok ? stored.order.totalCents : simulatedTotals.totalCents;

  const payment = await getPaymentProvider().createPayment({
    orderId: id,
    method: data.payment.method,
    amountCents: totalCents,
    // CPF só vai ao provedor quando o meio exige (hoje, boleto); o schema já validou.
    customer: { name: data.contact.name, email: data.contact.email, address, cpf: CPF_REQUIRED_METHODS.includes(data.payment.method) && data.payment.cpf ? onlyDigits(data.payment.cpf) : undefined },
    description: `Pedido ${id} - ${BRAND.name}`,
    providerData: data.payment.providerData,
  });

  if (stored?.ok) {
    if (!payment.ok) {
      await cancelStoredOrder(id);
      return { ok: false, message: payment.message };
    }
    const status = await recordPayment(id, {
      provider: payment.provider,
      reference: payment.reference,
      providerStatus: payment.providerStatus ?? payment.status,
      details: { ...payment.details, instructions: payment.instructions },
    });
    // Pagamento aprovado na hora: o recordPayment já agenda "pagamento aprovado" (que serve de confirmação).
    if (status === "aguardando-pagamento") queueOrderEmails(id, ["pedido-recebido"]);
    return { ok: true, order: { ...stored.order, status: status ?? stored.order.status, payment: { ...stored.order.payment, provider: payment.provider, reference: payment.reference, instructions: payment.instructions, details: payment.details } } };
  }

  if (!payment.ok) return { ok: false, message: payment.message };
  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: payment.status === "approved" ? "confirmado" : payment.status === "rejected" ? "recusado" : "aguardando-pagamento",
    customer: { name: data.contact.name, email: data.contact.email },
    address,
    shipping,
    payment: { method: data.payment.method, provider: payment.provider, reference: payment.reference, instructions: payment.instructions, details: payment.details },
    lines,
    subtotalCents,
    kitDiscount: simulatedTotals.kitDiscountCents > 0 ? { cents: simulatedTotals.kitDiscountCents, kits: simulatedTotals.kits.map((kit) => ({ slug: kit.slug, title: kit.title, sets: kit.sets, discountCents: kit.discountCents })) } : undefined,
    paymentDiscount: simulatedTotals.pixDiscountCents > 0 ? { percent: storePolicy.pixDiscountPercent, cents: simulatedTotals.pixDiscountCents } : undefined,
    totalCents,
    simulated: payment.provider === "simulado",
  };
  return { ok: true, order };
}

/** Kits ativos (prévia da sacola e do checkout: agrupar e mostrar a economia). O desconto que vale é o do servidor. */
export async function activeKits(): Promise<Kit[]> {
  return getKits();
}
