import { BRAND } from "@/lib/brand";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/cart/config";
import { formatPrice } from "@/lib/format";
import { SHIPPING_OPTIONS } from "@/lib/checkout/shipping";

// Página /sobre (fase 8 da rodada de conteúdo): manifesto, o que vendemos e como trabalhamos. Tudo o que depende de
// dado real da empresa (prazos, canais, horários, licenciamento) vem marcado "[CONFIRMAR]" e aparece destacado na página.
// Sem texto jurídico: as regras ficam nas páginas de Termos, Trocas e Envio (redigidas pelo responsável).
export const CONFIRM = "[CONFIRMAR]";

export const sobre = {
  manifesto: {
    title: "Feita para quem sente a corrida.",
    paragraphs: [
      "A Fórmula 1 nunca foi só sobre carros. É sobre o domingo que começa cedo, a volta de classificação que prende a respiração, a largada que arrepia, o piloto que vira ídolo e a equipe que vira família.",
      `A ${BRAND.name} nasceu dessa paixão. Fazemos roupas, acessórios e colecionáveis para quem carrega a corrida no peito, na arquibancada, no sofá de casa ou a caminho do trabalho numa segunda-feira qualquer.`,
      "Acreditamos em peças bem feitas, em design que respeita a história do esporte e em contar essa história com o cuidado de quem também é fã. Precisão, herança e performance: as mesmas palavras que movem a pista orientam cada coisa que fazemos.",
    ],
  },
  whatWeSell: {
    intro: `Uma coleção inspirada na cultura da Fórmula 1, organizada em quatro frentes. Não somos uma loja oficial de nenhuma equipe ou piloto: somos fãs criando para fãs. ${CONFIRM} Quais produtos, se houver, são licenciados, e por quem.`,
  },
  howWeWork: [
    {
      title: "Envio",
      href: "/envio",
      text: `Enviamos para todo o Brasil ${CONFIRM}. Hoje o checkout oferece ${SHIPPING_OPTIONS.map((o) => `${o.label.toLowerCase()} (${o.days})`).join(" e ")}, com frete grátis na econômica a partir de ${formatPrice(FREE_SHIPPING_THRESHOLD_CENTS)} ${CONFIRM}. Todo pedido tem código de rastreio, enviado por e-mail assim que sai do estoque ${CONFIRM}.`,
    },
    {
      title: "Trocas e devoluções",
      href: "/trocas-e-devolucoes",
      text: `Comprou e se arrependeu? Você tem 7 dias a partir do recebimento para desistir da compra feita pela internet. Para trocar por outro tamanho ou modelo, o prazo é de ${CONFIRM} dias, e a primeira troca tem frete por nossa conta ${CONFIRM}. Os detalhes estão na página de trocas.`,
    },
    {
      title: "Atendimento",
      href: "/contato",
      text: `Fale com a gente por e-mail e WhatsApp ${CONFIRM}, de segunda a sexta, das ${CONFIRM} às ${CONFIRM}. Respondemos em até ${CONFIRM} horas úteis. Gente de verdade, que entende de corrida, do outro lado.`,
    },
  ],
};
