import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DriverCardList } from "@/components/drivers-section";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Pilotos",
  description: "Coleções de Lando Norris, Max Verstappen, Lewis Hamilton e Gabriel Bortoleto.",
  alternates: { canonical: "/pilotos" },
};

export default function PilotosPage() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Pilotos" }]} />
        <div className="mt-8">
          <PageIntro eyebrow="Os pilotos" title="Escolha seu piloto" body="Camisetas, bonés, miniaturas e pôsteres de quem acelera no grid." />
        </div>
        <DriverCardList className="mt-12" />
      </div>
    </div>
  );
}
