import { drivers as driverCards } from "@/lib/drivers";
import type { Category, Driver, Product, ProductDetail, Team } from "./types";

// Linhas das tabelas do Supabase (supabase/migrations) ↔ tipos do catálogo (lib/catalog/types.ts). Funções puras, com
// testes (supabase-mapping.test.ts): o mesmo mapeamento serve para ler (repositório) e para gravar (seed e admin).

export type CategoryRow = { slug: string; name: string; description: string; image: string; position: number };
export type TeamRow = { slug: string; name: string; tagline: string; color: string; brand_color: string; logo: Team["logo"]; position: number };
export type DriverRow = { slug: string; name: string; team_slug: string; number: number | null; phrase: string; image: string; position: number };
export type VariantRow = { sku: string; product_id: string; size: string; color: string | null; stock: number; position: number };
export type ImageRow = { id?: string; product_id: string; src: string; alt: string; illustrative: boolean; storage_path?: string | null; position: number };
export type ProductRow = {
  id: string;
  code: string | null;
  slug: string;
  name: string;
  description: string;
  details: ProductDetail[];
  details_pending: boolean;
  price_cents: number;
  compare_at_price_cents: number | null;
  category_slug: string;
  team_slug: string | null;
  driver_slug: string | null;
  tags: string[];
  is_new: boolean;
  featured: boolean;
  status: Product["status"];
  illustrative: boolean;
  position: number;
  created_at: string;
  product_variants?: VariantRow[];
  product_images?: ImageRow[];
};

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export const categoryFromRow = (row: CategoryRow): Category => ({ slug: row.slug, name: row.name, description: row.description, image: row.image });
export const categoryToRow = (category: Category, position: number): CategoryRow => ({ ...category, position });

export const teamFromRow = (row: TeamRow): Team => ({ slug: row.slug, name: row.name, tagline: row.tagline, color: row.color, brandColor: row.brand_color, logo: row.logo });
export const teamToRow = (team: Team, position: number): TeamRow => ({
  slug: team.slug,
  name: team.name,
  tagline: team.tagline,
  color: team.color,
  brand_color: team.brandColor,
  logo: team.logo,
  position,
});

// Fotos da página e carro do piloto são do site (lib/drivers.ts), não do banco: o banco guarda nome, equipe e frase.
// Piloto novo no banco sem cadastro em lib/drivers.ts usa a `image` da linha em todas as fotos.
export function driverFromRow(row: DriverRow): Driver {
  const card = driverCards.find((item) => item.slug === row.slug);
  const fallback = { src: row.image, width: 1170, height: 1462, position: "50% 30%" };
  return {
    slug: row.slug,
    name: row.name,
    teamSlug: row.team_slug,
    number: row.number ?? undefined,
    phrase: row.phrase,
    image: card?.image ?? row.image,
    imagePosition: card?.imagePosition,
    photoMain: card?.photoMain ?? fallback,
    photoSecondary: card?.photoSecondary ?? fallback,
    carImage: card?.carImage,
    carFacing: card?.carFacing,
  };
}
export const driverToRow = (driver: Driver, position: number): DriverRow => ({
  slug: driver.slug,
  name: driver.name,
  team_slug: driver.teamSlug,
  number: driver.number ?? null,
  phrase: driver.phrase,
  image: driver.image,
  position,
});

export function productFromRow(row: ProductRow): Product {
  return {
    id: row.code ?? row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    details: row.details?.length ? row.details : undefined,
    detailsPending: row.details_pending || undefined,
    priceCents: row.price_cents,
    compareAtPriceCents: row.compare_at_price_cents ?? undefined,
    categorySlug: row.category_slug,
    teamSlug: row.team_slug ?? undefined,
    driverSlug: row.driver_slug ?? undefined,
    images: [...(row.product_images ?? [])].sort(byPosition).map((image) => ({ src: image.src, alt: image.alt, illustrative: image.illustrative || undefined })),
    variants: [...(row.product_variants ?? [])].sort(byPosition).map((variant) => ({ sku: variant.sku, size: variant.size, color: variant.color ?? undefined, stock: variant.stock })),
    tags: row.tags ?? [],
    isNew: row.is_new,
    featured: row.featured || undefined,
    status: row.status,
    illustrative: row.illustrative || undefined,
    createdAt: row.created_at,
  };
}

/** Produto → linhas (sem `id`: o banco gera; `code` guarda o id legível do seed, ex.: APX-001). */
export function productToRows(product: Product, position: number) {
  const row: Omit<ProductRow, "id" | "product_variants" | "product_images"> = {
    code: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    details: product.details ?? [],
    details_pending: product.detailsPending ?? false,
    price_cents: product.priceCents,
    compare_at_price_cents: product.compareAtPriceCents ?? null,
    category_slug: product.categorySlug,
    team_slug: product.teamSlug ?? null,
    driver_slug: product.driverSlug ?? null,
    tags: product.tags,
    is_new: product.isNew,
    featured: product.featured ?? false,
    status: product.status,
    illustrative: product.illustrative ?? false,
    position,
    created_at: product.createdAt,
  };
  const variants = product.variants.map((variant, index) => ({ sku: variant.sku, size: variant.size, color: variant.color ?? null, stock: variant.stock, position: index }));
  const images = product.images.map((image, index) => ({ src: image.src, alt: image.alt, illustrative: image.illustrative ?? false, position: index }));
  return { row, variants, images };
}
