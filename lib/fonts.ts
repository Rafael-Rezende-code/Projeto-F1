import { Archivo, Geist } from "next/font/google";

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
  variable: "--font-display",
});

// Textos, interface e preços: Geist variável.
export const fontSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/** Classes para o <html>: expõem as variáveis CSS das duas famílias. */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable}`;
