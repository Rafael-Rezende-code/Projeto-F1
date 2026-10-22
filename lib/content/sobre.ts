import { BRAND } from "@/lib/brand";
import { storePolicy } from "@/lib/store-policy";

// Página /sobre (refino 2, item 4): o que a loja é, o que vende e como trabalha. Fatos dados pelo responsável: loja de
// artigos de Fórmula 1 e cultura do automobilismo, SEM vínculo, patrocínio ou aprovação da F1, das equipes ou dos
// pilotos. Entrega, prazos e trocas NÃO são escritos aqui: vêm de lib/store-policy.ts (sem configuração, não aparecem). Sem texto jurídico: as regras ficam em Termos, Trocas e Envio (redigidas pelo responsável).
// Dados da empresa (e-mail etc.) vêm de lib/company.ts e só aparecem quando preenchidos.
export const CONFIRM = "[CONFIRMAR]";

export const sobre = {
  manifesto: {
    title: "Feita para quem sente a corrida.",
    paragraphs: [
      `A ${BRAND.name} é uma loja de artigos de Fórmula 1 e de cultura do automobilismo. Reunimos num lugar só o que um fã procura: a camiseta da equipe do coração, a miniatura do carro que marcou uma temporada, a pista favorita para pôr na estante.`,
      "A Fórmula 1 nunca foi só sobre carros. É o domingo que começa cedo, a volta de classificação que prende a respiração, o piloto que vira ídolo e a equipe que vira família. É essa história, de hoje e de décadas atrás, que a gente quer levar para a sua casa.",
    ],
    independence:
      "Somos uma loja independente, de fãs para fãs. Não temos vínculo, patrocínio nem aprovação da Fórmula 1, das equipes ou dos pilotos.",
  },
  whatWeSell: {
    intro: "Do grid atual aos ídolos de outras épocas, seis frentes:",
    items: [
      { title: "Camisetas de todas as equipes", text: "Do grid inteiro, não só das mais populares." },
      { title: "Miniaturas de carros", text: "Carros de várias temporadas, em escalas de coleção." },
      { title: "Pistas impressas em 3D", text: "O traçado dos circuitos em relevo, para a parede ou a mesa." },
      { title: "Canecas", text: "Para o café da manhã de domingo de corrida." },
      { title: "Pilotos históricos", text: "Itens dos nomes que fizeram a história da categoria." },
      { title: "Colecionáveis", text: "Peças para guardar e exibir." },
    ],
    madeToOrder:
      "Algumas peças ficam em estoque e outras são feitas sob encomenda ou importadas. O prazo de cada uma aparece na página do produto, antes da compra.",
  },
  // Entrega e trocas são promessas: só aparecem se a loja as configurou (lib/store-policy.ts, variáveis NEXT_PUBLIC_POLICY_*).
  howWeWork: [
    ...(storePolicy.deliveryArea || storePolicy.shippingNote
      ? [{ title: "Entrega", href: "/envio", text: [storePolicy.deliveryArea, storePolicy.shippingNote].filter(Boolean).join(" ") }]
      : []),
    ...(storePolicy.returnsNote ? [{ title: "Trocas e devoluções", href: "/trocas-e-devolucoes", text: storePolicy.returnsNote }] : []),
    {
      title: "Atendimento",
      href: "/contato",
      text: "Dúvida sobre um produto, um tamanho ou um pedido? Fale com a gente: do outro lado tem gente que também acompanha cada corrida.",
    },
  ],
};
