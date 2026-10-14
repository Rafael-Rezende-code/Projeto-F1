// Grade "Com quem você corre?": nome da equipe + foto (emblema sobre a cor da equipe).
// Fotos em public/images/equipes, 1600x900 (16:9); a da Mercedes é 1448x1086 (4:3).
// A foto ocupa o card menos a faixa do nome, e se dissolve na cor da base (color = cor da borda inferior da foto):
// assim o emblema nunca fica embaixo do nome, mesmo nos cards pequenos do celular.
// position = object-position da foto; na Mercedes (4:3, mais alta), sobe o enquadramento para o aro não encostar no topo.
export type Team = {
  name: string;
  image: string;
  color: string;
  position?: string;
};

export const teams: Team[] = [
  { name: "Ferrari", image: "/images/equipes/ferrari.jpeg", color: "#ba0e05" },
  { name: "Mercedes", image: "/images/equipes/mercedes.jpeg", color: "#0d6765", position: "50% 30%" },
  { name: "McLaren", image: "/images/equipes/mclaren.jpeg", color: "#e65503" },
  { name: "Red Bull Racing", image: "/images/equipes/redbull.jpeg", color: "#14233d" },
  { name: "Aston Martin", image: "/images/equipes/astonmartin.jpeg", color: "#13463b" },
  { name: "Alpine", image: "/images/equipes/alpine.jpeg", color: "#ef92d3" },
  { name: "Williams", image: "/images/equipes/williams.jpeg", color: "#165bf8" },
  { name: "Haas", image: "/images/equipes/haas.jpeg", color: "#c7c3c4" },
];

// Largura real do card: grade de no máx. 1200px; 4 colunas a partir de 640px, 2 abaixo (página com padding de 20/40px).
export const TEAM_IMAGE_SIZES =
  "(min-width: 1280px) 300px, (min-width: 640px) calc((100vw - 80px) / 4), calc((100vw - 40px) / 2)";
export const TEAM_IMAGE_QUALITY = 90;
