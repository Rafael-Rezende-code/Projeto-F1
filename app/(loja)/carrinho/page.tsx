import type { Metadata } from "next";
import { privateRobots } from "@/lib/indexing";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CartContents } from "@/components/cart-contents";
import { MostWanted } from "@/components/most-wanted";
import { PageIntro } from "@/components/page-intro";
import { isOrderStoreConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sacola", robots: privateRobots };

export default function CarrinhoPage() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Sacola" }]} />
        <div className="mb-10 mt-8">
          <PageIntro eyebrow="Sua compra" title="Sacola" />
        </div>
        <CartContents variant="page" empty={<MostWanted />} couponsEnabled={isOrderStoreConfigured()} />
      </div>
    </div>
  );
}
