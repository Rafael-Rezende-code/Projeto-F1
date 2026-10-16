"use server";

import { BRAND } from "@/lib/brand";
import { catalog } from "@/lib/catalog";
import { getShippingOption, shippingPrice } from "@/lib/checkout/shipping";
import { checkoutSchema, CPF_REQUIRED_METHODS, fieldErrors } from "@/lib/checkout/schema";
import { newOrderId, type Order, type OrderLine } from "@/lib/checkout/order";
import { getPaymentProvider } from "@/lib/payments";
import { onlyDigits } from "@/lib/validators/br";

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; message: string; errors?: Record<string, string>; stockIssues?: { sku: string; available: number }[] };

// Server action do checkout. Nunca confia no cliente: valida tudo com zod de novo, busca preço e estoque de cada SKU
// no catálogo, recalcula frete e total, e só então chama o provedor de pagamento (hoje, o simulado).
// Pedido SIMULADO: não é gravado em lugar nenhum (ver CLAUDE.md, "Checkout").
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os dados destacados.", errors: fieldErrors(parsed.error) };
  const data = parsed.data;

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
    });
  }
  if (stockIssues.length) return { ok: false, message: "Alguns itens não têm mais estoque suficiente. Ajuste a sacola e tente de novo.", stockIssues };

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const option = getShippingOption(data.shipping.shippingId);
  if (!option) return { ok: false, message: "Forma de entrega inválida." };
  const shippingCents = shippingPrice(option, subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const id = newOrderId();

  const payment = await getPaymentProvider().createPayment({
    orderId: id,
    method: data.payment.method,
    amountCents: totalCents,
    // CPF só vai ao provedor quando o meio exige (hoje, boleto); o schema já validou.
    customer: { name: data.contact.name, email: data.contact.email, cpf: CPF_REQUIRED_METHODS.includes(data.payment.method) && data.payment.cpf ? onlyDigits(data.payment.cpf) : undefined },
    description: `Pedido ${id} - ${BRAND.name}`,
  });
  if (!payment.ok) return { ok: false, message: payment.message };

  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: payment.status === "approved" ? "confirmado" : "aguardando-pagamento",
    customer: { name: data.contact.name, email: data.contact.email },
    address: {
      street: data.address.street,
      number: data.address.number,
      complement: data.address.complement || undefined,
      district: data.address.district,
      city: data.address.city,
      state: data.address.state,
      cep: data.address.cep,
    },
    shipping: { id: option.id, label: option.label, days: option.days, priceCents: shippingCents },
    payment: { method: data.payment.method, provider: payment.provider, reference: payment.reference, instructions: payment.instructions },
    lines,
    subtotalCents,
    totalCents,
    simulated: true,
  };
  return { ok: true, order };
}
