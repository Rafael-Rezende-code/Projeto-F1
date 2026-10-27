import type { Legend } from "./types";

export const senna: Legend = {
  slug: "senna",
  name: "Ayrton Senna",
  shortName: "Senna",
  country: "Brasil",
  years: "1984–1994",
  color: "#f2c500",
  born: "1960-03-21",
  died: "1994-05-01",
  opening: "Três títulos, uma chuva em Portugal e um país inteiro acordando cedo aos domingos.",
  trajectory: [
    "Paulistano, Ayrton Senna começou no kart aos 13 anos, num carrinho que o pai montou com um motor pequeno de cortador de grama. Chegou à Fórmula 1 em 1984, pela Toleman, e logo no ano seguinte, já na Lotus, venceu pela primeira vez: o GP de Portugal de 1985, debaixo de chuva, largando da pole.",
    "Na McLaren, entre 1988 e 1993, viveu a fase mais vitoriosa. Foi campeão mundial em 1988, 1990 e 1991 e construiu uma relação única com Mônaco, onde venceu seis vezes. Em 1994 mudou-se para a Williams.",
    "Morreu em 1º de maio de 1994, aos 34 anos, depois de um acidente no GP de San Marino, em Ímola, quando liderava a corrida. Para muitos brasileiros, segue sendo um herói nacional.",
  ],
  milestones: [
    { value: "3", label: "títulos mundiais (1988, 1990 e 1991), todos pela McLaren" },
    { value: "41", label: "vitórias em 11 temporadas" },
    { value: "65", label: "pole positions, recorde na época" },
    { value: "6", label: "vitórias em Mônaco, recorde do GP" },
  ],
  curiosities: [
    "A primeira vitória e a primeira pole vieram no mesmo fim de semana: GP de Portugal de 1985, na chuva.",
    "Começou no kart aos 13 anos, num carrinho feito pelo pai com motor de cortador de grama.",
    "Correu por quatro equipes na Fórmula 1: Toleman, Lotus, McLaren e Williams.",
  ],
  photo: { src: "/images/editorial/senna-sentado.jpeg", alt: "Ayrton Senna, de óculos escuros e macacão vermelho e branco, sentado num guard-rail, sorrindo", position: "50% 15%" },
  articles: ["senna-e-a-mclaren"],
};
