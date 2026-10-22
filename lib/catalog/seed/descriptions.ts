import { BRAND } from "@/lib/brand";
import type { ProductDetail } from "../types";

// DESCRIÇÕES DO SEED (fase 7 da rodada de conteúdo): 2 parágrafos curtos (separados por linha em branco) + lista de
// detalhes (material, caimento, cuidados). Os detalhes são EXEMPLOS e ficam marcados "[CONFERIR COM O PRODUTO REAL]"
// na página (detailsPending) até virem da ficha técnica do fornecedor. Nunca dizer que a peça é oficial, licenciada ou
// endossada por equipe ou piloto: são peças inspiradas, de fã para fã.
export type Copy = { description: string; details: ProductDetail[] };

const p = (...paragraphs: string[]) => paragraphs.join("\n\n");

const tee = (fit = "Regular, reto no corpo") => [
  { label: "Material", value: "100% algodão penteado, malha de toque macio" },
  { label: "Caimento", value: fit },
  { label: "Cuidados", value: "Lavar do avesso em água fria; não usar secadora; passar do avesso" },
];
const cap = [
  { label: "Material", value: "Sarja de algodão, aba pré-curvada" },
  { label: "Ajuste", value: "Fecho traseiro regulável, tamanho único" },
  { label: "Cuidados", value: "Limpar à mão com pano úmido; não lavar na máquina" },
];
const hoodie = [
  { label: "Material", value: "Moletom de algodão com poliéster, felpado por dentro" },
  { label: "Caimento", value: "Regular, com punhos e barra canelados" },
  { label: "Cuidados", value: "Lavar do avesso em água fria; secar à sombra" },
];
const jacket = [
  { label: "Material", value: "Poliamida leve com acabamento repelente à água" },
  { label: "Caimento", value: "Regular, com espaço para uma camada por baixo" },
  { label: "Cuidados", value: "Lavar à mão ou em ciclo delicado; não passar" },
];

// Seis peças da coleção da casa (as que já estavam na home).
export const homeCopy: Record<string, Copy> = {
  "scuderia-racing-jacket": {
    description: p(
      "Corte reto, gola alta e linhas que lembram um macacão de corrida. Uma jaqueta pensada para quem torce de vermelho e quer levar essa paixão para a rua.",
      "Forro leve, zíper frontal e bolsos laterais para o dia a dia. Combina com camiseta lisa no fim de semana de corrida e com tudo no resto da semana.",
    ),
    details: [...jacket.slice(0, 2), { label: "Detalhes", value: "Zíper frontal, gola alta e bolsos laterais" }, jacket[2]],
  },
  "ferrari-team-cap": {
    description: p(
      "Seis gomos, aba curva e o vermelho de Maranello como inspiração. O boné que vai do autódromo ao café da manhã de domingo sem pedir licença.",
      "Ajuste traseiro para encontrar o encaixe certo e estrutura firme na frente, que mantém a forma depois de muitos fins de semana.",
    ),
    details: cap,
  },
  "monaco-racing-tee": {
    description: p(
      "Uma camiseta com estampa inspirada nas ruas de Mônaco, o circuito mais estreito e mais charmoso do calendário.",
      "Algodão penteado, modelagem regular e toque macio desde a primeira lavagem. Para usar sozinha ou por baixo de uma jaqueta.",
    ),
    details: tee(),
  },
  "classic-racing-hoodie": {
    description: p(
      "O moletom de todo fã: capuz, felpa macia e bordado discreto no peito. Clássico de propósito, para durar muitas temporadas.",
      "Punhos e barra canelados seguram o calor nas manhãs de corrida. Fica bem com jeans, com bermuda e com o sofá de casa.",
    ),
    details: [...hoodie.slice(0, 2), { label: "Detalhes", value: "Capuz com cordão e bordado no peito" }, hoodie[2]],
  },
  "pit-lane-overshirt": {
    description: p(
      "Uma sobrecamisa de sarja com bolsos utilitários, inspirada no uniforme de quem trabalha nos boxes. Feita para o dia inteiro.",
      "Usa aberta, por cima de uma camiseta, ou fechada, como camisa. Resiste ao uso e fica melhor com o tempo.",
    ),
    details: [
      { label: "Material", value: "Sarja de algodão encorpada" },
      { label: "Caimento", value: "Reto, um pouco mais amplo que uma camisa" },
      { label: "Detalhes", value: "Dois bolsos utilitários com aba, botões de pressão" },
      { label: "Cuidados", value: "Lavar em água fria; secar à sombra" },
    ],
  },
  "apex-circuit-tote": {
    description: p(
      `A bolsa da casa: lona resistente, alças reforçadas e o traçado de um circuito estampado. ${BRAND.name} para levar tudo.`,
      "Cabe o notebook, a garrafa d'água e o casaco para quando o sol se esconder na arquibancada.",
    ),
    details: [
      { label: "Material", value: "Lona de algodão resistente" },
      { label: "Medidas", value: "Aprox. 40 × 38 cm, alças de 60 cm" },
      { label: "Cuidados", value: "Lavar à mão; não usar alvejante" },
    ],
  },
};

// Peças por equipe (4 por equipe). `line`: uma frase própria da equipe (a mesma tagline do cabeçalho).
export function teamCopy(kind: "camiseta" | "bone" | "moletom" | "jaqueta", team: string, line: string): Copy {
  switch (kind) {
    case "camiseta":
      return {
        description: p(
          `Uma camiseta de torcedor com as cores da ${team} para a temporada 2026. ${line}`,
          "Algodão macio, modelagem regular e estampa resistente a muitas lavagens. Feita para o domingo de corrida e para os outros seis dias.",
        ),
        details: tee(),
      };
    case "bone":
      return {
        description: p(
          `Boné nas cores da ${team}, com aba curva e ajuste traseiro. ${line}`,
          "Leve e firme na medida certa. Protege do sol na arquibancada e completa o visual de quem acompanha cada largada.",
        ),
        details: cap,
      };
    case "moletom":
      return {
        description: p(
          `Moletom com capuz nas cores da ${team}, felpado por dentro e com bolso canguru. ${line}`,
          "Para as manhãs frias de corrida e para as madrugadas de GP do outro lado do mundo.",
        ),
        details: hoodie,
      };
    case "jaqueta":
      return {
        description: p(
          `Jaqueta corta-vento nas cores da ${team}, leve e com capuz embutido na gola. ${line}`,
          "Dobra fácil na mochila e segura o vento e a garoa. A peça que todo fã quer ter à mão em dia de autódromo.",
        ),
        details: [...jacket.slice(0, 2), { label: "Detalhes", value: "Capuz embutido na gola, zíper frontal" }, jacket[2]],
      };
  }
}

// Peças por piloto (4 por piloto). Homenagem de fã: nada de autógrafo ou assinatura do piloto (ver CLAUDE.md).
export function driverCopy(kind: "camiseta" | "bone" | "miniatura" | "poster", driver: string, phrase: string): Copy {
  switch (kind) {
    case "camiseta":
      return {
        description: p(
          `Camiseta de torcedor com o nome de ${driver} nas costas. ${phrase}`,
          "Algodão penteado e modelagem regular, para vestir a torcida do jeito mais simples.",
        ),
        details: tee(),
      };
    case "bone":
      return {
        description: p(
          `Boné da linha de ${driver}, com o nome bordado na lateral. ${phrase}`,
          "Aba curva, ajuste traseiro e estrutura que mantém a forma. Para usar na arquibancada e fora dela.",
        ),
        details: cap,
      };
    case "miniatura":
      return {
        description: p(
          `Miniatura de capacete em escala 1:5 inspirada em ${driver}, com base expositora. ${phrase}`,
          "Uma peça de coleção para a estante, a mesa de trabalho ou o canto da casa dedicado à corrida.",
        ),
        details: [
          { label: "Escala", value: "1:5, com base expositora" },
          { label: "Material", value: "Resina pintada à mão" },
          { label: "Cuidados", value: "Limpar com pincel macio ou pano seco; evitar sol direto" },
        ],
      };
    case "poster":
      return {
        description: p(
          `Pôster 50 × 70 cm de ${driver}, impresso em papel fotográfico fosco. ${phrase}`,
          "Chega enrolado num tubo rígido, pronto para emoldurar.",
        ),
        details: [
          { label: "Tamanho", value: "50 × 70 cm" },
          { label: "Papel", value: "Fotográfico fosco" },
          { label: "Envio", value: "Em tubo rígido; moldura não inclusa" },
        ],
      };
  }
}
