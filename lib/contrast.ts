// Contraste WCAG 2.x entre duas cores hex (#RRGGBB). Usado para escolher a cor de texto pequeno sobre a cor da equipe.
const luminance = (hex: string) => {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrastRatio(a: string, b: string) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Branco sólido se ele atingir 4,5:1 sobre `background` (texto pequeno, AA); senão, preto. */
export const readableTextOn = (background: string) => (contrastRatio("#FFFFFF", background) >= 4.5 ? "#FFFFFF" : "#000000");
