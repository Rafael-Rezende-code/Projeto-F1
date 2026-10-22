// Modelo de dados do catálogo. Preços sempre em centavos (inteiro, BRL).
// Estes tipos são o contrato entre as páginas e a camada de dados (lib/catalog/repository.ts):
// trocar o seed por Supabase não deve mudar nada aqui.

export type ProductStatus = "active" | "draft" | "archived";

export type ProductImage = {
  src: string;
  alt: string;
  /** Imagem de demonstração reaproveitada (placeholder), não é foto real do produto. */
  illustrative?: boolean;
};

export type ProductVariant = {
  /** SKU único da variante; também é a chave da variante no carrinho. */
  sku: string;
  /** Tamanho exibido ("P", "M", "G", "GG", "Único"...). */
  size: string;
  color?: string;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  /** Preço "de" (riscado), quando há promoção. Sempre maior que priceCents. */
  compareAtPriceCents?: number;
  categorySlug: string;
  teamSlug?: string;
  driverSlug?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: string[];
  isNew: boolean;
  status: ProductStatus;
  /** Produto ilustrativo (seed de demonstração): não é um item real à venda. */
  illustrative?: boolean;
  /** Data de lançamento (ISO), usada na ordenação "novidades". */
  createdAt: string;
  /** Destaque: aparece primeiro nas vitrines curtas (seção VELOCIDADE, miniaturas do topo do piloto). */
  featured?: boolean;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export type Team = {
  slug: string;
  name: string;
  tagline: string;
  /** Cor dos cards/cabeçalhos (texto branco com contraste ≥ 3:1). */
  color: string;
  brandColor: string;
  logo: { src: string; width: number; height: number; displayHeight: number };
};

export type DriverPhoto = { src: string; width: number; height: number; position: string; desktopPosition?: string };

export type Driver = {
  slug: string;
  name: string;
  teamSlug: string;
  number?: number;
  phrase: string;
  image: string;
  imagePosition?: string;
  /** Fotos da página do piloto (lib/drivers.ts): principal no topo, secundária no bloco editorial. */
  photoMain: DriverPhoto;
  photoSecondary: DriverPhoto;
  /** Carro do topo da página (PNG transparente) e para que lado ele aponta no arquivo (lib/drivers.ts). */
  carImage?: string;
  carFacing?: "left" | "right";
};

/** Resultado da busca (sobreposição de busca do site). */
export type SearchResults = {
  products: Product[];
  teams: Team[];
  drivers: Driver[];
  categories: Category[];
};

export type ProductSort = "relevancia" | "menor-preco" | "maior-preco" | "novidades";

export type ProductFilters = {
  category?: string;
  team?: string;
  driver?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: ProductSort;
  isNew?: boolean;
  /** Texto livre (mesma regra da busca: todos os termos em nome, equipe, piloto, categoria ou tags) */
  query?: string;
  limit?: number;
};
