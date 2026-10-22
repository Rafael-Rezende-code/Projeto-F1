import { BRAND } from "@/lib/brand";
import type { Product, ProductVariant } from "../types";
import { driverCopy, homeCopy, teamCopy } from "./descriptions";
import { IMG } from "./images";
import { drivers } from "./drivers";
import { teams } from "./teams";

// SEED ILUSTRATIVO: todos os produtos abaixo são de demonstração (illustrative: true). Nomes, preços, estoques e
// descrições servem para montar a loja; não são itens reais à venda. Descrições e fichas em ./descriptions.ts. As fotos reaproveitam as imagens que o site
// já usava (lib/catalog/seed/images.ts), sem URLs novas.
//
// Ordem do array = ordem de "relevância" no catálogo.
// `featured`: 4 destaques (Scuderia Racing Jacket, Classic Racing Hoodie e as miniaturas de capacete de Hamilton e
// Bortoleto); a seção VELOCIDADE mostra os 3 primeiros na ordem do catálogo.

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

type Sale = Pick<Product, "fulfillment" | "dispatchDays" | "origin" | "package">;

type Base = Omit<Product, "id" | "variants" | "status" | "illustrative" | "createdAt" | keyof Sale> & {
  sizes: string[];
  createdAt?: string;
} & Partial<Sale>;

// Modelo de venda do seed (refino 2, item 5), por tipo de peça — EXEMPLO para exercitar a interface: camisetas, bonés e
// as peças da casa em estoque próprio; moletons e jaquetas de equipe sob encomenda (fornecedor nacional); miniaturas de
// capacete importadas sob encomenda; pôsteres impressos sob encomenda. Pesos e medidas da embalagem são estimativas.
function saleFor(slug: string, categorySlug: string): Sale {
  const own = (min: number, max: number) => ({ fulfillment: "estoque_proprio" as const, dispatchDays: { min, max }, origin: "nacional" as const });
  const pkg = (weightGrams: number, lengthCm: number, widthCm: number, heightCm: number) => ({ weightGrams, lengthCm, widthCm, heightCm });
  if (slug.startsWith("miniatura-capacete-"))
    return { fulfillment: "sob_encomenda", dispatchDays: { min: 15, max: 30 }, origin: "importado", package: pkg(900, 20, 20, 20) };
  if (slug.startsWith("poster-")) return { fulfillment: "sob_encomenda", dispatchDays: { min: 3, max: 6 }, origin: "nacional", package: pkg(300, 62, 8, 8) };
  if (/^(moletom|jaqueta)-/.test(slug)) return { fulfillment: "sob_encomenda", dispatchDays: { min: 7, max: 12 }, origin: "nacional", package: pkg(900, 35, 30, 8) };
  if (slug.startsWith("bone-") || categorySlug === "acessorios") return { ...own(1, 2), package: pkg(250, 25, 20, 14) };
  if (/jacket|hoodie|overshirt/.test(slug)) return { ...own(1, 2), package: pkg(1000, 35, 30, 8) };
  return { ...own(1, 2), package: pkg(250, 30, 25, 3) };
}

let counter = 0;
function product(base: Base): Product {
  counter += 1;
  const { sizes, ...rest } = base;
  const code = `APX-${String(counter).padStart(3, "0")}`;
  return {
    ...saleFor(rest.slug, rest.categorySlug),
    ...rest,
    // A partir da 2ª, as imagens são placeholders reaproveitados (usados na troca de foto no hover do card).
    images: rest.images.map((image, index) => (index > 0 ? { ...image, illustrative: true } : image)),
    id: code,
    variants: variants(code, counter, sizes),
    status: "active",
    illustrative: true,
    // Ficha de exemplo (lib/catalog/seed/descriptions.ts): conferir com o produto real antes de vender.
    detailsPending: true,
    // Datas espaçadas para a ordenação "novidades"; os marcados como novos são os mais recentes.
    createdAt: base.createdAt ?? new Date(Date.UTC(2026, 0, 1 + counter * 2)).toISOString(),
  };
}

// Produtos que já estavam na home.
const featured: Product[] = [
  product({
    slug: "scuderia-racing-jacket",
    featured: true,
    name: "Scuderia Racing Jacket",
    ...homeCopy["scuderia-racing-jacket"],
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
    ...homeCopy["ferrari-team-cap"],
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
    ...homeCopy["monaco-racing-tee"],
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
    featured: true,
    name: "Classic Racing Hoodie",
    ...homeCopy["classic-racing-hoodie"],
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
    ...homeCopy["pit-lane-overshirt"],
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
    name: `${BRAND.name} Circuit Tote`,
    ...homeCopy["apex-circuit-tote"],
    priceCents: 16990,
    categorySlug: "acessorios",
    images: [
      { src: IMG.tote, alt: `${BRAND.name} Circuit Tote` },
      { src: IMG.accessories, alt: `${BRAND.name} Circuit Tote, detalhe` },
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
    ...teamCopy("camiseta", team.name, team.tagline),
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
    ...teamCopy("bone", team.name, team.tagline),
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
    ...teamCopy("moletom", team.name, team.tagline),
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
    ...teamCopy("jaqueta", team.name, team.tagline),
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
      ...driverCopy("camiseta", driver.name, driver.phrase),
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
      ...driverCopy("bone", driver.name, driver.phrase),
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
      ...driverCopy("miniatura", driver.name, driver.phrase),
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
      // Destaques: as miniaturas de capacete de Hamilton e Bortoleto (seção VELOCIDADE e topo do piloto).
      featured: driver.slug === "hamilton" || driver.slug === "bortoleto",
    }),
    product({
      slug: `poster-${driver.slug}`,
      name: `Pôster ${driver.name}`,
      ...driverCopy("poster", driver.name, driver.phrase),
      priceCents: 9990,
      categorySlug: "colecionaveis",
      teamSlug: driver.teamSlug,
      driverSlug: driver.slug,
      images: [
        { src: driver.image, alt: `Pôster ${driver.name}` },
        { src: IMG.collectibles, alt: `Pôster ${driver.name}, ambiente` },
      ],
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
