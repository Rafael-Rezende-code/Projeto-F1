import type { Order } from "@/lib/checkout/order";

// Fila "Comprar no fornecedor" (refino 2, item 6): texto com os dados do cliente para colar no checkout do fornecedor.
// Compra MANUAL: nada aqui acessa marketplace nem automatiza a compra. Função pura (teste em supplier.test.ts).
export function formatCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : cep;
}

export function supplierAddressText(customer: { name: string; email: string; phone?: string | null }, address: Order["address"]) {
  return [
    customer.name,
    `${address.street}, ${address.number}${address.complement ? ` – ${address.complement}` : ""}`,
    `${address.district} – ${address.city}/${address.state}`,
    `CEP ${formatCep(address.cep)}`,
    customer.phone ? `Telefone: ${customer.phone}` : null,
    `E-mail: ${customer.email}`,
  ]
    .filter(Boolean)
    .join("\n");
}
