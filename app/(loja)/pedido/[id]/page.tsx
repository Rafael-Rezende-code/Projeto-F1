import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="px-5 pb-24 pt-12 sm:px-10 sm:pt-16">
      <div className="mx-auto max-w-[1400px]">
        <OrderConfirmation id={decodeURIComponent(id)} />
      </div>
    </div>
  );
}
