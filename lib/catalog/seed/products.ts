import type { Product, ProductVariant } from "../types";
import { IMG } from "./images";
import { drivers } from "./drivers";
import { teams } from "./teams";

// SEED ILUSTRATIVO: todos os produtos abaixo são de demonstração (illustrative: true). Nomes, preços, estoques e
// descrições servem para montar a loja; não são itens reais à venda. As fotos reaproveitam as imagens que o site
// já usava (lib/catalog/seed/images.ts), sem URLs novas.
//
// Ordem do array = ordem de "relevância" no catálogo.

const APPAREL = ["P", "M", "G", "GG"];

// Estoque determinístico (sem Math.random): varia por produto e tamanho, com alguns tamanhos esgotados.
function stockFor(seed: number, index: number) {
  const value = (seed * 7 + index * 13) % 11;
  return value < 2 ? 0 : value;
}

function variants(code: string, seed: number, sizes: string[]): ProductVariant[] {
  return sizes.map((size, index) => ({
    sku: `${code}-${size === "Único" ? "UN" : size}`,
    size,
    stock: sizes.length === 1 ? 5 + (seed % 9) : stockFor(seed, index),
  }));
}

type Base = Omit<Product, "id" | "variants" | "status" | "illustrative" | "createdAt"> & {
  sizes: string[];
  createdAt?: string;
};

let counter = 0;
function product(base: Base): Product {
  counter += 1;
  const { sizes, ...rest } = base;
  const code = `APX-${String(counter).padStart(3, "0")}`;
  return {
    ...rest,
    id: code,
    variants: variants(code, counter, sizes),
    status: "active",
    illustrative: true,
    // Datas espaçadas para a ordenação "novidades"; os marcados como novos são os mais recentes.
    createdAt: base.createdAt ?? new Date(Date.UTC(2026, 0, 1 + counter * 2)).toISOString(),
  };
}

// Produtos que já estavam na home.
const featured: Product[] = [
  product({
    slug: "scuderia-racing-jacket",
    name: "Scuderia Racing Jacket",
    description: "Jaqueta de corrida com corte reto, gola alta e detalhes inspirados no macacão da Scuderia. Forro leve, zíper frontal e bolsos laterais.",
    priceCents: 64990,
    categorySlug: "teamwear",
    teamSlug: "ferrari",
    images: [
      { src: IMG.jacket, alt: "Scuderia Racing Jacket" },
      { src: IMG.teamwear, alt: "Scuderia Racing Jacket em uso" },
    ],
    sizes: APPAREL,
    tags: ["jaqueta", "ferrari"],
    isNew: true,
    createdAt: "2026-09-20T00:00:00.000Z",
  }),
  product({
    slug: "ferrari-team-cap",
    name: "Ferrari Team Cap",
    description: "Boné de seis gomos com aba curva, ajuste traseiro e o vermelho de Maranello.",
    priceCents: 18990,
    categorySlug: "acessorios",
    teamSlug: "ferrari",
    images: [
      { src: IMG.cap, alt: "Ferrari Team Cap" },
      { src: IMG.accessories, alt: "Ferrari Team Cap, detalhe" },
    ],
    sizes: ["Único"],
    tags: ["bone", "ferrari"],
    isNew: false,
  }),
  product({
    slug: "monaco-racing-tee",
    name: "Monaco Racing Tee",
    description: "Camiseta de algodão penteado com estampa inspirada nas ruas de Mônaco. Modelagem regular.",
    priceCents: 22990,
    categorySlug: "racing",
    images: [
      { src: IMG.tee, alt: "Monaco Racing Tee" },
      { src: IMG.racing, alt: "Carro de Fórmula 1 em Mônaco" },
    ],
    sizes: APPAREL,
    tags: ["camiseta", "monaco"],
    isNew: false,
  }),
  product({
    slug: "classic-racing-hoodie",
    name: "Classic Racing Hoodie",
    description: "Moletom com capuz em felpa macia, punhos canelados e bordado discreto no peito.",
    priceCents: 39990,
    compareAtPriceCents: 45990,
    categorySlug: "teamwear",
    images: [
      { src: IMG.hoodie, alt: "Classic Racing Hoodie" },
      { src: IMG.teamwear, alt: "Classic Racing Hoodie em uso" },
    ],
    sizes: APPAREL,
    tags: ["moletom"],
    isNew: false,
  }),
  product({
    slug: "pit-lane-overshirt",
    name: "Pit Lane Overshirt",
    description: "Sobrecamisa de sarja com bolsos utilitários, pensada para o dia inteiro no paddock.",
    priceCents: 45990,
    categorySlug: "racing",
    images: [
      { src: IMG.overshirt, alt: "Pit Lane Overshirt" },
      { src: IMG.racing, alt: "Pit Lane Overshirt, inspiração" },
    ],
    sizes: APPAREL,
    tags: ["sobrecamisa"],
    isNew: true,
    createdAt: "2026-09-10T00:00:00.000Z",
  }),
  product({
    slug: "apex-circuit-tote",
    name: "Apex Circuit Tote",
    description: "Bolsa tote de lona resistente com o traçado de um circuito estampado. Alças reforçadas.",
    priceCents: 16990,
    categorySlug: "acessorios",
    images: [
      { src: IMG.tote, alt: "Apex Circuit Tote" },
      { src: IMG.accessories, alt: "Apex Circuit Tote, detalhe" },
    ],
    sizes: ["Único"],
    tags: ["bolsa"],
    isNew: false,
  }),
];

// Quatro itens por equipe (as 11 do grid).
const teamProducts: Product[] = teams.flatMap((team, i) => [
  product({
    slug: `camiseta-${team.slug}-2026`,
    name: `Camiseta ${team.name} 2026`,
    description: `Camiseta oficial de torcedor da ${team.name}, em algodão macio, com a identidade da equipe para a temporada 2026.`,
    priceCents: 21990 + (i % 3) * 1000,
    categorySlug: "teamwear",
    teamSlug: team.slug,
    images: [
      { src: IMG.tee, alt: `Camiseta ${team.name} 2026` },
      { src: IMG.teamwear, alt: `Camiseta ${team.name} 2026 em uso` },
    ],
    sizes: APPAREL,
    tags: ["camiseta", team.slug],
    isNew: i % 4 === 0,
  }),
  product({
    slug: `bone-${team.slug}`,
    name: `Boné ${team.name}`,
    description: `Boné da ${team.name} com aba curva e ajuste traseiro. Tamanho único.`,
    priceCents: 17990 + (i % 2) * 1000,
    compareAtPriceCents: i % 3 === 0 ? 21990 : undefined,
    categorySlug: "acessorios",
    teamSlug: team.slug,
    images: [
      { src: IMG.cap, alt: `Boné ${team.name}` },
      { src: IMG.accessories, alt: `Boné ${team.name}, detalhe` },
    ],
    sizes: ["Único"],
    tags: ["bone", team.slug],
    isNew: false,
  }),
  product({
    slug: `moletom-${team.slug}`,
    name: `Moletom ${team.name}`,
    description: `Moletom com capuz nas cores da ${team.name}, felpado por dentro e com bolso canguru.`,
    priceCents: 38990 + (i % 3) * 2000,
    categorySlug: "teamwear",
    teamSlug: team.slug,
    images: [
      { src: IMG.hoodie, alt: `Moletom ${team.name}` },
      { src: IMG.teamwear, alt: `Moletom ${team.name} em uso` },
    ],
    sizes: APPAREL,
    tags: ["moletom", team.slug],
    isNew: false,
  }),
  product({
    slug: `jaqueta-${team.slug}`,
    name: `Jaqueta ${team.name}`,
    description: `Jaqueta corta-vento da ${team.name}, leve e com capuz embutido na gola.`,
    priceCents: 59990 + (i % 4) * 2000,
    compareAtPriceCents: i % 5 === 2 ? 69990 + (i % 4) * 2000 : undefined,
    categorySlug: "racing",
    teamSlug: team.slug,
    images: [
      { src: IMG.jacket, alt: `Jaqueta ${team.name}` },
      { src: IMG.racing, alt: `Jaqueta ${team.name}, inspiração` },
    ],
    sizes: APPAREL,
    tags: ["jaqueta", team.slug],
    isNew: i % 4 === 1,
  }),
]);

// Quatro itens por piloto.
const driverProducts: Product[] = drivers.flatMap((driver, i) => {
  const first = driver.name.split(" ").slice(-1)[0];
  return [
    product({
      slug: `camiseta-${driver.slug}`,
      name: `Camiseta ${driver.name}`,
      description: `Camiseta de torcedor de ${driver.name}, com o nome do piloto nas costas.`,
      priceCents: 23990,
      categorySlug: "racing",
      teamSlug: driver.teamSlug,
      driverSlug: driver.slug,
      images: [
        { src: IMG.tee, alt: `Camiseta ${driver.name}` },
        { src: driver.image, alt: driver.name },
      ],
      sizes: APPAREL,
      tags: ["camiseta", driver.slug],
      isNew: i === 3,
    }),
    product({
      slug: `bone-${driver.slug}`,
      name: `Boné ${first}`,
      description: `Boné da linha de ${driver.name}, com assinatura bordada na lateral.`,
      priceCents: 19990,
      categorySlug: "acessorios",
      teamSlug: driver.teamSlug,
      driverSlug: driver.slug,
      images: [
        { src: IMG.cap, alt: `Boné ${first}` },
        { src: driver.image, alt: driver.name },
      ],
      sizes: ["Único"],
      tags: ["bone", driver.slug],
      isNew: false,
    }),
    product({
      slug: `miniatura-capacete-${driver.slug}`,
      name: `Miniatura de capacete ${first} 1:5`,
      description: `Réplica em escala 1:5 do capacete de ${driver.name}, com base expositora.`,
      priceCents: 89990,
      categorySlug: "colecionaveis",
      teamSlug: driver.teamSlug,
      driverSlug: driver.slug,
      images: [
        { src: IMG.collectibles, alt: `Miniatura de capacete ${first}` },
        { src: driver.image, alt: driver.name },
      ],
      sizes: ["Único"],
      tags: ["miniatura", driver.slug],
      isNew: i % 2 === 0,
    }),
    product({
      slug: `poster-${driver.slug}`,
      name: `Pôster ${driver.name}`,
      description: `Pôster 50 × 70 cm de ${driver.name}, impresso em papel fotográfico fosco.`,
      priceCents: 9990,
      categorySlug: "colecionaveis",
      teamSlug: driver.teamSlug,
      driverSlug: driver.slug,
      images: [{ src: driver.image, alt: `Pôster ${driver.name}` }],
      sizes: ["Único"],
      tags: ["poster", driver.slug],
      isNew: false,
    }),
  ];
});

export const products: Product[] = [...featured, ...driverProducts, ...teamProducts];

/** Produtos da home (mesma ordem das seções originais). */
export const HOME_GRID_SLUGS = ["scuderia-racing-jacket", "ferrari-team-cap", "monaco-racing-tee", "classic-racing-hoodie"];
export const HOME_CAROUSEL_SLUGS = ["ferrari-team-cap", "monaco-racing-tee", "classic-racing-hoodie", "pit-lane-overshirt", "apex-circuit-tote"];
