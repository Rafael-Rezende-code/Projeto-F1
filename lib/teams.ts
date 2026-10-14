import type { Logo } from "@/components/ui/logo-marquee";
import { f1Teams } from "@/lib/f1-teams";

// Identidade das 11 equipes: nome, slug da rota /equipes/[slug], cores e logo (a mesma da faixa de logos).
//
// brandColor: cor principal da identidade da equipe (valores conhecidos das identidades; conferir com os manuais
// de marca antes do lançamento).
// color: cor de fundo dos cards e cabeçalhos, com texto e logo SEMPRE brancos (decisão de produto). Quando o
// branco não atinge 3:1 sobre a brandColor, color é a própria cor escurecida o mínimo necessário (passos de 0,5%
// rumo ao preto, alvo 3,05:1). O nome vai em tamanho grande (≥ 18,7px em negrito), onde 3:1 é o mínimo WCAG.
// Contraste do branco: Ferrari 5,2 · Mercedes 3,2 · McLaren 3,05 (escurecida 10%) · Red Bull 16,1 ·
// Aston Martin 8,3 · Williams 5,4 · Alpine 3,3 · Haas 4,9 · Racing Bulls 8,8 · Audi 6,6 · Cadillac 18,9.
export type TeamIdentity = {
  slug: string;
  name: string;
  brandColor: string;
  color: string;
  logo: Logo;
  tagline: string;
};

const logo = (name: string) => {
  const found = f1Teams.find((team) => team.alt === name);
  if (!found) throw new Error(`Logo da equipe "${name}" não encontrada em lib/f1-teams.ts`);
  return found;
};

export const teams: TeamIdentity[] = [
  { slug: "ferrari", name: "Ferrari", brandColor: "#DC0000", color: "#DC0000", logo: logo("Ferrari"), tagline: "O vermelho mais famoso do grid." },
  { slug: "mercedes", name: "Mercedes", brandColor: "#00A19C", color: "#00A19C", logo: logo("Mercedes"), tagline: "Prata, preto e precisão alemã." },
  { slug: "mclaren", name: "McLaren", brandColor: "#FF8000", color: "#E77400", logo: logo("McLaren"), tagline: "Papaya de Woking para o mundo." },
  { slug: "red-bull-racing", name: "Red Bull Racing", brandColor: "#121F45", color: "#121F45", logo: logo("Red Bull Racing"), tagline: "Asas para quem acelera." },
  { slug: "aston-martin", name: "Aston Martin", brandColor: "#00594F", color: "#00594F", logo: logo("Aston Martin"), tagline: "O verde britânico de corrida." },
  { slug: "williams", name: "Williams", brandColor: "#005AFF", color: "#005AFF", logo: logo("Williams"), tagline: "Uma das grandes famílias da F1." },
  { slug: "alpine", name: "Alpine", brandColor: "#0090FF", color: "#0090FF", logo: logo("Alpine"), tagline: "Azul francês em ritmo de corrida." },
  { slug: "haas", name: "Haas", brandColor: "#DA291C", color: "#DA291C", logo: logo("Haas"), tagline: "A equipe americana do grid." },
  { slug: "racing-bulls", name: "Racing Bulls", brandColor: "#1634CB", color: "#1634CB", logo: logo("Racing Bulls"), tagline: "A escola de talentos de Faenza." },
  { slug: "audi", name: "Audi", brandColor: "#BB0A30", color: "#BB0A30", logo: logo("Audi"), tagline: "Quatro argolas no grid." },
  { slug: "cadillac", name: "Cadillac", brandColor: "#111111", color: "#111111", logo: logo("Cadillac"), tagline: "A estreia americana na F1." },
];

export const getTeamIdentity = (slug: string) => teams.find((team) => team.slug === slug);
export const getTeamIdentityByName = (name: string) => teams.find((team) => team.name === name);
