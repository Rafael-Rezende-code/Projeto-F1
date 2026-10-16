import localFont from "next/font/local";
import { Inter, Playfair_Display } from "next/font/google";

// TOKENS DE FONTE — o único lugar onde as famílias do site são definidas.
// Para trocar uma fonte: mude o import e a chamada abaixo (mantenha `variable`); o CSS usa só as variáveis
// --font-display e --font-sans (app/globals.css), e os ajustes finos (largura, peso, tracking) ficam nos tokens
// --display-* do globals.css.
//
// Títulos e textos usam arquivos ENXUTOS gerados a partir das variáveis do Google Fonts (SIL OFL; licenças em app/fonts/):
// só os glifos do português + sinais usados e só a faixa de eixos que o site usa (scripts/fonts/subset.cjs).
// Archivo: 88 KB → 46 KB; Geist: 29 KB → 18 KB (desempenho, rodada 2). Caractere fora da lista cai no fallback.
//
// Títulos: Archivo variável, largura (wdth) 106–125 e peso 300–900. A largura expandida dá a sensação de velocidade
// (116% no desktop, 106% no celular, 125% no nome gigante do rodapé); o KineticText anima o peso (300–900).
// Sem preload: os títulos grandes ficam abaixo do hero; entra com swap e fallback ajustado (sem salto perceptível).
export const fontDisplay = localFont({
  src: "../app/fonts/archivo-wdth106-125-wght300-900.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  preload: false,
  declarations: [{ prop: "font-stretch", value: "106% 125%" }],
  adjustFontFallback: "Arial",
  variable: "--font-display",
});

// Textos, interface e preços: Geist variável, peso 400–700. Sem preload (não disputa banda com a imagem do LCP).
export const fontSans = localFont({
  src: "../app/fonts/geist-wght400-700.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
  variable: "--font-sans",
});

// Acento em serifa itálica (logo, "Feita para", "pilotos" do hero, "Um jeito de viver.", primeiro nome dos pilotos):
// Playfair Display Italic, a fonte que o design original pedia (classe .font-playfair) e que nunca carregava. Só o
// itálico 400, subset latino. Sem preload: o fallback ajustado (size-adjust do next/font) evita salto de layout.
export const fontAccent = Playfair_Display({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-accent",
});

// Assinatura dos pilotos: Great Vibes (SIL OFL) lida pelo opentype.js do Signature (public/fonts/greatvibes-latin.woff,
// subconjunto latino em WOFF; o opentype.js não lê WOFF2). Não passa pelo next/font.

// HERO: tipografia própria, a da feat/loja (não alterar). Inter 400/500 só no hero (classe .hero-type no globals.css);
// o "pilotos" usa o itálico sintético da Inter, como no original (lá só os pesos normais carregavam). Sem preload: a
// imagem do hero é o LCP. O next/font registra a família com o nome "Inter", que só o .hero-type usa.
export const fontHero = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-hero",
});

/** Classes para o <html>: expõem as variáveis CSS das famílias. */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontAccent.variable} ${fontHero.variable}`;
