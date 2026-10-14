// Links do cabeçalho e do rodapé. Âncoras da home usam "/#..." para funcionar também nas páginas internas.
export type NavLink = { label: string; href: string };

export const headerLinks: NavLink[] = [
  { label: "Coleção", href: "/produtos" },
  { label: "Manifesto", href: "/#story" },
  { label: "Diário", href: "/#journal" },
];

export const footerColumns: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Comprar",
    links: [
      { label: "Teamwear", href: "/categorias/teamwear" },
      { label: "Racing", href: "/categorias/racing" },
      { label: "Colecionáveis", href: "/categorias/colecionaveis" },
      { label: "Acessórios", href: "/categorias/acessorios" },
      { label: "Novidades", href: "/produtos?ordem=novidades" },
    ],
  },
  {
    heading: "Explorar",
    links: [
      { label: "Equipes", href: "/#teams" },
      { label: "Pilotos", href: "/#pilotos" },
      { label: "Circuitos", href: "/#collection" },
      { label: "Cultura F1", href: "/#story" },
      { label: "Sobre a Apex", href: "/sobre" },
    ],
  },
  {
    heading: "Ajuda",
    links: [
      { label: "Contato", href: "/contato" },
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
