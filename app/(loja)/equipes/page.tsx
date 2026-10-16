import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { TeamCard } from "@/components/team-card";
import { teams } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Equipes",
  description: "As 11 equipes do grid: roupas, bonés e colecionáveis de cada uma.",
  alternates: { canonical: "/equipes" },
};

export default function EquipesPage() {
  return (
    <div className="px-5 pb-24 pt-8 sm:px-10 sm:pt-10">
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Equipes" }]} />
        <div className="mt-8">
          <PageIntro eyebrow="Escolha sua equipe" title="Com quem você corre?" body="Roupas e colecionáveis inspirados nas equipes que definem o grid." />
        </div>
        {/* Mesma grade da home: 4 + 4 + 3 centralizado; 2 por linha no celular, a última (sozinha) em largura total. */}
        <ul role="list" className="mt-12 flex flex-wrap justify-center gap-3">
          {teams.map((team, index) => {
            const wide = teams.length % 2 === 1 && index === teams.length - 1;
            return (
              <li key={team.slug} className={`${wide ? "w-full" : "w-[calc(50%-6px)]"} sm:w-[calc(25%-9px)]`}>
                <TeamCard team={team} wideOnMobile={wide} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
