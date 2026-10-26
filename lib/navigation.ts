import { BRAND } from "@/lib/brand";
// Links do cabeçalho e do rodapé. Âncoras da home usam "/#..." para funcionar também nas páginas internas.
export type NavLink = { label: string; href: string };

// Refino 3: "Coleção" virou "Produtos" (catálogo) para não confundir com "Coleções" (landings editoriais).
export const headerLinks: NavLink[] = [
  { label: "Produtos", href: "/produtos" },
  { label: "Coleções", href: "/colecoes" },
  { label: "Presentes", href: "/presentes" },
  { label: "Manifesto", href: "/#story" },
  { label: "Diário", href: "/diario" },
];

// Menu (celular): navegação principal em destaque + as coleções com produto (vindas do servidor) + atalhos de ajuda.
export const menuLinks: NavLink[] = [
  { label: "Início", href: "/" },
  { label: "Produtos", href: "/produtos" },
  { label: "Coleções", href: "/colecoes" },
  { label: "Presentes", href: "/presentes" },
  { label: "Equipes", href: "/equipes" },
  { label: "Pilotos", href: "/pilotos" },
  { label: "Novidades", href: "/produtos?ordem=novidades" },
  { label: "Favoritos", href: "/favoritos" },
];
export const menuSecondaryLinks: NavLink[] = [
  { label: "Manifesto", href: "/#story" },
  { label: "Diário", href: "/diario" },
  { label: "Sacola", href: "/carrinho" },
  { label: "Consultar pedido", href: "/pedido/consultar" },
  { label: "Envio", href: "/envio" },
  { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
  { label: "Contato", href: "/contato" },
];

// "Comprar" recebe, entre "Todos os produtos" e "Presentes", as coleções com produto publicado (components/site-footer.tsx).
export const footerColumns: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Comprar",
    links: [
      { label: "Todos os produtos", href: "/produtos" },
      { label: "Presentes", href: "/presentes" },
      { label: "Novidades", href: "/produtos?ordem=novidades" },
    ],
  },
  {
    heading: "Explorar",
    links: [
      { label: "Equipes", href: "/equipes" },
      { label: "Pilotos", href: "/pilotos" },
      { label: "Circuitos", href: "/#collection" },
      { label: "Cultura F1", href: "/#story" },
      { label: "Diário", href: "/diario" },
      { label: `Sobre a ${BRAND.name}`, href: "/sobre" },
    ],
  },
  {
    heading: "Ajuda",
    links: [
      { label: "Contato", href: "/contato" },
      { label: "Consultar pedido", href: "/pedido/consultar" },
      { label: "Envio", href: "/envio" },
      { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
      { label: "Guia de tamanhos", href: "/faq" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

export const legalLinks: NavLink[] = [
  { label: "Política de Privacidade", href: "/politica-de-privacidade" },
  { label: "Termos de Uso", href: "/termos-de-uso" },
];
