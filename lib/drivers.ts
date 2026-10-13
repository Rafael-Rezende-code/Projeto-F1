export type Driver = {
  slug: string;
  name: string;
  team: string;
  /** Cor da equipe: fundo que varre o card no hover/foco. */
  color: string;
  /** Cor do texto sobre a cor da equipe. */
  textColor: string;
  /** Detalhe opcional (fio, rótulo da equipe e "Ver coleção"). Sem ele, usa textColor. */
  accent?: string;
  phrase: string;
  image: string;
  /** object-position da foto no card 4:5, para enquadrar rosto e capacete. */
  imagePosition?: string;
  href: string;
};

// Ordem de exibição.
export const drivers: Driver[] = [
  {
    slug: "norris",
    name: "Lando Norris",
    team: "McLaren",
    color: "#FF8000",
    textColor: "#111111",
    phrase: "Papaya até a última volta.",
    image: "/images/pilotos/norris.jpeg",
    imagePosition: "50% 30%",
    href: "#collection",
  },
  {
    slug: "verstappen",
    name: "Max Verstappen",
    team: "Red Bull Racing",
    color: "#1B2A5C",
    textColor: "#FFFFFF",
    phrase: "Implacável, volta após volta.",
    image: "/images/pilotos/verstappen.png",
    imagePosition: "50% 30%",
    href: "#collection",
  },
  {
    slug: "hamilton",
    name: "Lewis Hamilton",
    team: "Ferrari",
    color: "#DC0000",
    textColor: "#FFFFFF",
    phrase: "Uma lenda vestida de vermelho.",
    image: "/images/pilotos/hamilton.png",
    imagePosition: "50% 30%",
    href: "#collection",
  },
  {
    slug: "bortoleto",
    name: "Gabriel Bortoleto",
    team: "Audi",
    color: "#0B0B0B",
    textColor: "#FFFFFF",
    accent: "#A7A9AC",
    phrase: "O Brasil de volta ao grid.",
    image: "/images/pilotos/bortoleto.png",
    imagePosition: "50% 30%",
    href: "#collection",
  },
];
