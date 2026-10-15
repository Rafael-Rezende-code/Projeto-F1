import { Archivo, Geist, Great_Vibes, Playfair_Display } from "next/font/google";

// TOKENS DE FONTE — o único lugar onde as famílias do site são definidas.
// Para trocar uma fonte: mude o import e a chamada abaixo (mantenha `variable`); o CSS usa só as variáveis
// --font-display e --font-sans (app/globals.css), e os ajustes finos (largura, peso, tracking) ficam nos tokens
// --display-* do globals.css.
//
// Títulos: Archivo variável (pesos 100–900 e eixo de largura wdth 62–125), só o estilo normal. A largura expandida dá a sensação de
// velocidade; o KineticText de "Luzes apagadas." anima o peso dessa mesma fonte.
export const fontDisplay = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  // Só o estilo normal: a itálica (≈88 KB) servia apenas à palavra "pilotos" do hero, que usa itálico sintético.
  style: ["normal"],
  display: "swap",
  // Sem preload: os títulos grandes ficam abaixo do hero, e o arquivo (≈88 KB) disputava banda com o LCP. Entra com
  // swap (fallback ajustado pelo next/font, sem salto perceptível).
  preload: false,
  variable: "--font-display",
});

// Textos, interface e preços: Geist variável.
export const fontSans = Geist({
  subsets: ["latin"],
  display: "swap",
  // Sem preload: o texto aparece na hora com o fallback ajustado e troca para a Geist quando ela chega; com preload, a
  // fonte disputava banda com a imagem do LCP (medido no Lighthouse mobile).
  preload: false,
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

// Assinatura dos pilotos (components/driver-signature.tsx): Great Vibes, manuscrita GENÉRICA (SIL OFL). Nunca imitar o
// autógrafo real de um piloto. Sem preload: só as páginas de piloto a usam (o arquivo só baixa onde aparece).
export const fontSignature = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-signature",
});

/** Classes para o <html>: expõem as variáveis CSS das famílias. */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontAccent.variable} ${fontSignature.variable}`;
