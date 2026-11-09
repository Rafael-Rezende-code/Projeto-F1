// SESSÃO DO CAMPEÃO (Kimi Antonelli, campeão mundial de 2026). Dados e configuração; os componentes ficam em
// components/campeao/. Fatos: só os com duas fontes (docs/conteudo/antonelli.md). Imagens: docs/conteudo/imagens.md.
//
// CAMPEAO_DESTAQUE_ATE: até esta data (inclusive, dia de São Paulo) a home mostra a capa do campeão e a faixa de aviso
// no topo. Depois, as duas somem sozinhas; o card dourado em /pilotos (e na lista da home) e o link no menu e no rodapé
// continuam. A home é regenerada de hora em hora (ISR), então a troca acontece no máximo 1 h depois da meia-noite.

export const CAMPEAO_DESTAQUE_ATE = "2026-12-31";

export const CAMPEAO = {
  slug: "antonelli",
  name: "Kimi Antonelli",
  shortName: "Kimi",
  team: "Mercedes",
  year: 2026,
  /** Tag dos produtos do campeão (entram pelo admin; sem migração). */
  tag: "antonelli",
  href: "/campeao",
  /** Paleta da sessão: papel claro, preto, ouro e o verde-azulado/prata da Mercedes. */
  colors: { paper: "#e4dfdc", ink: "#0d0d0d", gold: "#b88a2c", goldLight: "#e9cf8f", teal: "#00a19c", silver: "#c6c8ca", dark: "#0b0b0c" },
} as const;

/** Faixa de aviso no topo da home (dispensável; a escolha fica no localStorage). */
export const CAMPEAO_AVISO = { text: "Kimi Antonelli, campeão mundial 2026", cta: "ver", storageKey: "apex:aviso-campeao:v1" } as const;
/** Script inline (home, antes do cabeçalho): com o aviso já dispensado, esconde a faixa antes da primeira pintura. Fica
 * aqui (e não no componente client) porque constante importada de módulo "use client" num server component vira
 * referência de cliente. */
export const AVISO_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(CAMPEAO_AVISO.storageKey)})==="1"){var s=document.createElement("style");s.textContent="#aviso-campeao{display:none!important}";document.head.appendChild(s)}}catch(e){}`;

/** A capa e a faixa da home aparecem até CAMPEAO_DESTAQUE_ATE (inclusive), pelo dia de São Paulo. */
export function campeaoDestaqueAtivo(now: number = Date.now(), until: string = CAMPEAO_DESTAQUE_ATE): boolean {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return today <= until;
}

// ---- Coroação (porta do protótipo docs/referencia/coroacao/index.html; VALORES do protótipo) ----
export const COROACAO = {
  /** Altura da seção (o filho fixo tem 100svh). */
  height: "320svh",
  typed: "THE CHAMPI",
  /** Fim do título depois do encaixe ("..": cursor piscando antes). */
  ending: "ON",
  /** Linha do tempo em p (progresso da rolagem dentro da seção, 0–1). */
  timeline: {
    typeEnd: 0.1, // 0–0.10 digita "THE CHAMPI"
    kimiStart: 0.03, // 0.03–0.12 "Kimi" aparece
    kimiEnd: 0.12,
    crownStart: 0.14, // 0.14–0.58 a coroa desce (easeInOutCubic)
    crownEnd: 0.58,
    seat: 0.58, // p ≥ 0.58: encaixe, brilho e "ON" (reversível)
    seal: 0.72, // p ≥ 0.72: selo
    hintUntil: 0.06, // dica "ROLE PARA COROAR" só antes disso
  },
  /** Posição da camada coroa + mãos no palco 16:9 (frações do palco). */
  crown: { left: "9.99%", top: "23.06%", width: "80.74%", from: { y: -150, rotate: -3, scale: 1.06 } },
  shadow: { left: "29%", top: "63.2%", width: "42%", height: "9%" },
  /** Texto do selo (textPath com textLength 486 fecha o círculo) e o miolo. */
  seal: { text: "CAMPEÃO MUNDIAL 2026 · O MAIS JOVEM DA HISTÓRIA ·", center: "20", label: "Campeão mundial de 2026, o mais jovem da história, aos 20 anos" },
  hint: "ROLE PARA COROAR",
} as const;

/** easeInOutCubic (o mesmo do protótipo). */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Estado da cena para um progresso p (puro: testado em lib/campeao.test.ts e usado pelo componente). */
export function coroacaoFrame(p: number) {
  const t = COROACAO.timeline;
  const typedCount = Math.round(clamp01(p / t.typeEnd) * COROACAO.typed.length);
  const kimi = clamp01((p - t.kimiStart) / (t.kimiEnd - t.kimiStart));
  const d = easeInOutCubic(clamp01((p - t.crownStart) / (t.crownEnd - t.crownStart)));
  const from = COROACAO.crown.from;
  return {
    typed: COROACAO.typed.slice(0, typedCount),
    kimiOpacity: kimi,
    /** deslocamento do "Kimi" em cqw */
    kimiY: (1 - kimi) * 2.2,
    crownY: from.y * (1 - d),
    crownRotate: from.rotate * (1 - d),
    crownScale: 1 + (from.scale - 1) * (1 - d),
    shadowOpacity: Math.pow(d, 3),
    shadowScale: 0.75 + 0.25 * d,
    seated: p >= t.seat,
    seal: p >= t.seal,
    hint: p < t.hintUntil,
  };
}

// ---- Imagens (derivados de scripts/images/campeao.mjs) ----
const D = "/images/campeao/derivados";
const srcset = (name: string, widths: number[], ext: "avif" | "webp") => widths.map((w) => `${D}/${name}-${w}.${ext} ${w}w`).join(", ");
export type CampeaoImage = { avif: string; webp: string; fallback: string; width: number; height: number };
const image = (name: string, widths: number[], width: number, height: number): CampeaoImage => ({
  avif: srcset(name, widths, "avif"),
  webp: srcset(name, widths, "webp"),
  fallback: `${D}/${name}-${widths[widths.length - 1]}.webp`,
  width,
  height,
});
export const CAMPEAO_IMAGES = {
  face: image("rosto", [768, 1280, 1672], 1672, 941),
  crown: image("coroa", [768, 1280, 1774], 1774, 887),
  flag: image("bandeira", [768, 1280, 1672], 1672, 941),
  flagVertical: image("bandeira-vertical", [768, 1170], 1170, 1463),
  goldMask: `${D}/mascara-ouro.webp`,
  composite: `${D}/composicao-final.jpg`,
  /** Foto original (vertical) usada no card e no topo da página do piloto. */
  portrait: "/images/campeao/bandeira vertical.jpeg",
} as const;

// Larguras exibidas (para `sizes`): palco = min(100vw, 177.78svh) a partir de 768px; 235vw no celular. Coroa = 80,74%.
export const STAGE_SIZES = "(max-width: 767px) 235vw, min(100vw, 177.78svh)";
export const CROWN_SIZES = "(max-width: 767px) 190vw, min(81vw, 143.6svh)";

// ---- Card dourado do campeão (feat/antonelli-2; components/campeao/gold-champion-card.tsx) ----
// Home: fundo com a bandeira (sem coroa e sem o texto da F1 de cima), botão para a coroação. /pilotos: a foto do pódio,
// botão para a ficha do campeão. `sizes`: largura DESENHADA da foto (object-cover numa caixa mais estreita que a foto).
export type CampeaoCardVariant = "home" | "pilotos";
export const CAMPEAO_CARD = {
  eyebrow: "O campeão",
  /** docs/conteudo/antonelli.md: campeão de 2026 (5 fontes) e o mais jovem da história (SKY, GP, F1, ESPN, WIKI). */
  line: "Campeão mundial 2026 · o mais jovem da história",
  home: {
    image: { src: "/images/campeao/derivados/bandeira-sem-texto.jpg", width: 1672, height: 753, position: "50% 30%", alt: "Kimi Antonelli olha para o alto, enrolado na bandeira da Itália, com a medalha no peito" },
    // celular: foto 16:11 em cima (~1,5× a largura da caixa, coberta pela foto 2,22:1); 640–1023: 16:9 (1,25×); lg: 2 linhas de cards.
    sizes: "(min-width: 1024px) min(70vw, 980px), (min-width: 640px) 125vw, 155vw",
    primary: { label: "Reviva a coroação", href: "/campeao" },
    secondary: { label: "Ver a ficha do campeão", href: "/pilotos/antonelli" },
  },
  pilotos: {
    image: { src: "/images/pilotos/antonelli/podio.jpeg", width: 1170, height: 1560, position: "58% 12%", alt: "Kimi Antonelli no pódio do México, de boné, com a bandeira da Itália na mão" },
    sizes: "(min-width: 1480px) 694px, (min-width: 1024px) calc(50vw - 46px), (min-width: 640px) calc(100vw - 80px), calc(100vw - 40px)",
    primary: { label: "Ver a ficha do campeão", href: "/pilotos/antonelli" },
    secondary: { label: "Reviva a coroação", href: "/campeao" },
  },
} as const;

// ---- Fatos (duas fontes cada: docs/conteudo/antonelli.md) ----
export type CampeaoNumber = { value: string; label: string; unit?: string };
/** No máximo 3 números (faixa do capítulo 2, com contagem animada). */
export const CAMPEAO_NUMBERS: CampeaoNumber[] = [
  { value: "20", unit: "anos", label: "e 68 dias: o campeão mais jovem da história" },
  { value: "9", unit: "vitórias", label: "na temporada de 2026 até o título" },
  { value: "73", unit: "anos", label: "de espera por um campeão italiano, desde Alberto Ascari em 1953" },
];

/** Faixa de números da ficha do campeão (/pilotos/antonelli): NO MÁXIMO 4, cada um com 2+ fontes (as siglas de
 * docs/conteudo/antonelli.md ficam em `sources`, só para conferência; não aparecem na página). */
export const CAMPEAO_RECORDS: (CampeaoNumber & { sources: string[] })[] = [
  { value: "20", unit: "anos", label: "e 68 dias: o campeão mais jovem da história (antes: Sebastian Vettel, aos 23, em 2010)", sources: ["SKY", "GP", "ESPN"] },
  { value: "9", unit: "vitórias", label: "na temporada de 2026 até o título", sources: ["SKY", "GP", "WIKI"] },
  { value: "73", unit: "anos", label: "de espera: o primeiro italiano campeão desde Alberto Ascari (1953)", sources: ["SKY", "GP", "ESPN", "WIKI"] },
  { value: "4", unit: "corridas", label: "ainda por disputar quando o título foi decidido", sources: ["ESPN", "GP"] },
];

/** Linha do tempo da ficha do campeão (só fatos com 2+ fontes; docs/conteudo/antonelli.md). */
export const CAMPEAO_TIMELINE: { date: string; title: string; text: string }[] = [
  { date: "25 ago. 2006 · Bologna", title: "O começo", text: "Kimi Antonelli nasce em Bologna, na Itália." },
  { date: "2026 · China", title: "A primeira vitória", text: "No GP da China, a primeira vitória na Fórmula 1, pela Mercedes, com o número 12." },
  { date: "2026 · Monza", title: "Vitória em casa", text: "Venceu o GP da Itália: o primeiro italiano a vencer em Monza desde Ludovico Scarfiotti, em 1966." },
  { date: "1º nov. 2026 · México", title: "Campeão do mundo", text: "Terceiro lugar no GP da Cidade do México, com quatro corridas por disputar: título decidido aos 20 anos e 68 dias." },
];

/** Texto curto do capítulo 2 (fato confirmado: primeiro italiano campeão em 73 anos). */
export const CAMPEAO_BANDEIRA_TEXT = {
  eyebrow: "Primeiro italiano campeão em 73 anos",
  title: "A espera acabou.",
  body: "Desde Alberto Ascari, em 1953, a Itália não tinha um campeão mundial de Fórmula 1. Em 1º de novembro de 2026, no México, Kimi Antonelli encerrou a espera.",
};

// ---- Capítulos da página /campeao (dirigida por dados: acrescente capítulos aqui) ----
export type CampeaoChapter =
  | { id: string; kind: "coroacao"; label: string }
  | { id: string; kind: "bandeira"; label: string }
  | { id: string; kind: "colecao"; label: string; title: string; body: string; emptyTitle: string; emptyBody: string };

export const CAMPEAO_CHAPTERS: CampeaoChapter[] = [
  { id: "coroacao", kind: "coroacao", label: "A coroação" },
  { id: "bandeira", kind: "bandeira", label: "A bandeira" },
  {
    id: "colecao",
    kind: "colecao",
    label: "A coleção",
    title: "A coleção do campeão",
    body: "Peças para celebrar o título de 2026.",
    emptyTitle: "Em breve.",
    emptyBody: "A coleção do campeão está sendo preparada. Entre na lista e saiba quando chegar.",
  },
];

export const CAMPEAO_META = {
  title: "Kimi Antonelli, campeão mundial 2026",
  description:
    "Kimi Antonelli, o mais jovem campeão da história da Fórmula 1, aos 20 anos, e o primeiro italiano campeão desde 1953. A coroação, os números e a coleção do campeão.",
};

// ---- Barra superior dourada (feat/antonelli-2) ----
// Enquanto CAMPEAO_DESTAQUE_ATE valer, o cabeçalho de TODAS as páginas ganha um estilo dourado discreto (fio dourado na
// base do cartão, borda levemente dourada e o ponto do logo em ouro). Decidido NO NAVEGADOR, pelo relógio do visitante
// (dia de São Paulo): páginas estáticas geradas antes da data voltam ao normal sozinhas, sem deploy novo. Mesma técnica do
// HERO_FONT_SCRIPT: um <style> no <head> (nada de atributo no <html>, que o React compara na hidratação). Depois da data,
// o mesmo script esconde a faixa de aviso da home (#aviso-campeao), caso a home em cache ainda a traga.
export const CAMPEAO_BARRA_CSS =
  ":root{--barra-ouro:1}.site-header-card{border-color:rgba(200,150,44,.55)!important}.site-header-marca{color:#c8962c!important}";
export const CAMPEAO_BARRA_SCRIPT = `try{var d=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());var s=document.createElement("style");s.textContent=d<=${JSON.stringify(CAMPEAO_DESTAQUE_ATE)}?${JSON.stringify(CAMPEAO_BARRA_CSS)}:"#aviso-campeao{display:none!important}";document.head.appendChild(s)}catch(e){}`;

// ---- Ficha do campeão (/pilotos/antonelli; components/campeao/ficha-campeao.tsx) ----
export const CAMPEAO_FICHA = {
  hero: {
    image: { src: "/images/campeao/derivados/bandeira-sem-texto.jpg", width: 1672, height: 753, position: "50% 30%", alt: "Kimi Antonelli olha para o alto, enrolado na bandeira da Itália, com a medalha no peito" },
    // Foto 2,22:1 com object-cover numa caixa mais alta: a largura desenhada é a altura da tela × 2,22.
    sizes: "(min-width: 768px) max(100vw, 200svh), 220svh",
    ribbon: "Campeão Mundial 2026",
    /** Número do carro: WIKI, F1-NUM, AUTOSPORT-NUM. */
    line: "Mercedes · carro número 12",
  },
  reviva: {
    eyebrow: "A coroação",
    title: "Reviva a coroação.",
    body: "Role a página e coloque a coroa no campeão, quadro a quadro.",
    cta: "Reviva a coroação",
  },
  colecao: {
    eyebrow: "Coleção do Kimi",
    title: "A coleção do campeão",
    body: "Peças para celebrar o título de 2026.",
    emptyTitle: "Em breve.",
    emptyBody: "A coleção do campeão está sendo preparada. Entre na lista e saiba quando chegar.",
  },
} as const;

/** Galeria em mosaico (bento). `area`: posição no mosaico de 12 colunas × 2 linhas (lg); abaixo de 1024px, 2 colunas com
 * a proporção `ratio`. Fotos em public/images/pilotos/antonelli/ (docs/conteudo/imagens.md). */
export type CampeaoFoto = { src: string; width: number; height: number; alt: string; position: string; area: "grande" | "alta" | "larga-1" | "larga-2"; ratio: string; span?: boolean };
export const CAMPEAO_GALERIA: CampeaoFoto[] = [
  { src: "/images/pilotos/antonelli/comemoracao.jpeg", width: 1170, height: 1542, area: "grande", ratio: "1 / 1", span: true, position: "50% 30%", alt: "De capacete, em pé no carro, Kimi Antonelli aponta para o alto ao lado da placa do primeiro lugar" },
  { src: "/images/pilotos/antonelli/podio.jpeg", width: 1170, height: 1560, area: "alta", ratio: "3 / 4", position: "50% 25%", alt: "No pódio, de boné, Kimi Antonelli sorri com a bandeira da Itália na mão" },
  { src: "/images/pilotos/antonelli/olhar.jpeg", width: 1170, height: 1431, area: "larga-1", ratio: "3 / 4", position: "50% 42%", alt: "Close no capacete verde e amarelo: só os olhos de Kimi Antonelli aparecem pela viseira" },
  { src: "/images/pilotos/antonelli/retrato-garagem.jpeg", width: 1170, height: 1587, area: "larga-2", ratio: "16 / 10", span: true, position: "50% 24%", alt: "Kimi Antonelli sentado num pneu, cercado de pneus, sorrindo" },
];
