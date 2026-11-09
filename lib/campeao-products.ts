import type { Product } from "@/lib/catalog/types";
import { CAMPEAO } from "@/lib/campeao";

// Produtos do campeão: os que têm a tag `antonelli` (entram pelo admin, sem migração) ou o piloto antonelli. Puro.
export const isChampionProduct = (product: Product) => product.tags.includes(CAMPEAO.tag) || product.driverSlug === CAMPEAO.slug;

export const championProducts = (products: Product[]) => products.filter(isChampionProduct);
