import localFont from "next/font/local";

// Inter variável (100–900) SÓ para o título cinético "Luzes apagadas." (KineticText varia o peso de 300 a 900).
// O restante do site continua na fonte do sistema: a tipografia do site é uma decisão pendente (ver CLAUDE.md).
//
// Por que next/font/local e não next/font/google: nesta versão do Next o next/font/google registra a família com
// o nome real ("Inter"), e o CSS global pede `font-family: 'Inter'` para todos os elementos; a fonte vazaria para
// o site inteiro. O next/font/local usa o nome da constante como família (sem colisão).
// Arquivo: Inter variável, subconjunto latin, do Google Fonts (licença SIL Open Font License 1.1).
// preload: false → o arquivo só é baixado quando o título aparece (no celular ele fica oculto e não baixa).
export const kineticFont = localFont({
  src: "../app/fonts/inter-variable-latin.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  variable: "--font-kinetic",
});
