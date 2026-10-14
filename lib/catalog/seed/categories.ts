import type { Category } from "../types";
import { IMG } from "./images";

export const categories: Category[] = [
  { slug: "teamwear", name: "Teamwear", description: "Represente sua equipe.", image: IMG.teamwear },
  { slug: "racing", name: "Racing", description: "Feito para a velocidade.", image: IMG.racing },
  { slug: "colecionaveis", name: "Colecionáveis", description: "Guarde a memória.", image: IMG.collectibles },
  { slug: "acessorios", name: "Acessórios", description: "Leve o grid com você.", image: IMG.accessories },
];
