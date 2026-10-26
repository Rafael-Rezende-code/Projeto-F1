import { BRAND } from "@/lib/brand";
// Páginas institucionais e legais: SÓ a estrutura (títulos das seções). Todo o texto é placeholder marcado como
// "[CONTEÚDO A SER REDIGIDO]" e será escrito pelo responsável (não redigir texto jurídico aqui).
export const PLACEHOLDER = "[CONTEÚDO A SER REDIGIDO]";

export type InstitutionalPage = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: string[];
  /** Perguntas (FAQ): cada uma vira um <details> com resposta placeholder. */
  questions?: string[];
  updatedLabel?: boolean;
};

export const institutionalPages: Record<string, InstitutionalPage> = {
  "politica-de-privacidade": {
    slug: "politica-de-privacidade",
    eyebrow: "Legal",
    title: "Política de Privacidade",
    description: `Como a ${BRAND.name} trata dados pessoais, em conformidade com a LGPD.`,
    updatedLabel: true,
    sections: [
      "Quem somos (controlador dos dados)",
      "Dados que coletamos",
      "Para que usamos os dados",
      "Bases legais do tratamento",
      "Compartilhamento com terceiros",
      "Cookies e tecnologias semelhantes",
      "Seus direitos como titular",
      "Por quanto tempo guardamos os dados",
      "Segurança da informação",
      "Encarregado (DPO) e canal de contato",
      "Alterações desta política",
    ],
  },
  "termos-de-uso": {
    slug: "termos-de-uso",
    eyebrow: "Legal",
    title: "Termos de Uso",
    description: `Regras de uso do site e das compras na ${BRAND.name}.`,
    updatedLabel: true,
    sections: [
      "Aceitação dos termos",
      "Cadastro e conta",
      "Produtos, preços e disponibilidade",
      "Pedidos e pagamento",
      "Entrega",
      "Direito de arrependimento, trocas e devoluções",
      "Propriedade intelectual",
      "Responsabilidades",
      "Legislação aplicável e foro",
    ],
  },
  "trocas-e-devolucoes": {
    slug: "trocas-e-devolucoes",
    eyebrow: "Ajuda",
    title: "Trocas e devoluções",
    description: "Prazos e passos para trocar ou devolver um produto.",
    updatedLabel: true,
    sections: [
      "Direito de arrependimento",
      "Troca por tamanho ou modelo",
      "Produto com defeito",
      "Como solicitar",
      "Reembolso: formas e prazos",
      "Itens que não podem ser trocados",
    ],
  },
  envio: {
    slug: "envio",
    eyebrow: "Ajuda",
    title: "Envio",
    description: "Prazos, valores e acompanhamento das entregas.",
    sections: ["Regiões atendidas", "Prazos de entrega", "Valores e frete grátis", "Rastreamento do pedido", "Ausência no recebimento e endereço incorreto"],
  },
  contato: {
    slug: "contato",
    eyebrow: "Ajuda",
    title: "Contato",
    description: `Fale com a ${BRAND.name}.`,
    sections: ["Canais de atendimento", "Horário de atendimento", "Endereço", "Imprensa e parcerias"],
  },
  faq: {
    slug: "faq",
    eyebrow: "Ajuda",
    title: "Perguntas frequentes",
    description: "Dúvidas comuns sobre produtos, pedidos, entregas e trocas.",
    sections: [],
    questions: [
      "Como escolho o tamanho certo?",
      "Quais formas de pagamento são aceitas?",
      "Qual é o prazo de entrega?",
      "Como acompanho meu pedido?",
      "Como faço uma troca ou devolução?",
      "Os produtos são oficiais e licenciados?",
      "Posso alterar ou cancelar um pedido?",
    ],
  },
  sobre: {
    slug: "sobre",
    eyebrow: `A ${BRAND.name}`,
    title: `Sobre a ${BRAND.name}`,
    description: "Cultura, roupas e colecionáveis premium de Fórmula 1.",
    // Página própria desde a fase 8 da rodada de conteúdo (app/(loja)/sobre + lib/content/sobre.ts); fica aqui para
    // título, descrição e sitemap.
    sections: [],
  },
};

export const getInstitutionalPage = (slug: string) => institutionalPages[slug];
