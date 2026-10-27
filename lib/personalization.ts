// Camisa personalizada (loja extra, item 3): regras puras usadas no navegador (prévia e aviso na hora) e no servidor
// (placeOrder, que decide). O banco confere de novo o formato, a faixa e soma o adicional (create_order).
import { PERSONALIZATION_BLOCKLIST } from "@/lib/personalization-blocklist";

export type PersonalizationConfig = {
  /** Adicional por unidade, em centavos. */
  feeCents: number;
  /** Limite de caracteres do nome (padrão 12). */
  maxName: number;
  numberMin: number;
  numberMax: number;
  /** Opcional: foto das costas (da galeria) com o texto posicionado por porcentagens. */
  back?: { src: string; nameTop: number; numberTop: number; color?: string } | null;
};
export type Personalization = { name?: string; number?: string };

export const DEFAULT_PERSONALIZATION: Omit<PersonalizationConfig, "feeCents"> = { maxName: 12, numberMin: 0, numberMax: 99 };

/** Nome como é estampado: maiúsculas, acentos convertidos (Ç → C), só letras, números, espaço e hífen. */
export function normalizeName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trimStart();
}

const blocked = (name: string) => {
  const words = name.split(/[\s-]+/).filter(Boolean);
  const squashed = name.replace(/[\s-]/g, "");
  // Texto picado em pedaços curtos ("P O R R A", "PU-TA") é tentativa de burlar: aí vale o texto todo junto.
  const chopped = words.length > 1 && words.some((word) => word.length <= 2);
  const spaced = ` ${words.join(" ")} `;
  return PERSONALIZATION_BLOCKLIST.some((term) => words.includes(term) || spaced.includes(` ${term} `) || (chopped && squashed.includes(term.replace(/\s/g, ""))));
};

export type PersonalizationResult = { ok: true; value: { name?: string; number?: string } } | { ok: false; errors: { name?: string; number?: string } };

export function validatePersonalization(input: Personalization, config: Pick<PersonalizationConfig, "maxName" | "numberMin" | "numberMax">): PersonalizationResult {
  const name = normalizeName(input.name ?? "").trim().replace(/^-+|-+$/g, "").trim();
  const number = String(input.number ?? "").trim();
  const errors: { name?: string; number?: string } = {};
  if (!name && !number) errors.name = "Escreva um nome ou escolha um número.";
  if (name.length > config.maxName) errors.name = `Use até ${config.maxName} caracteres.`;
  else if (name && blocked(name)) errors.name = "Esse nome não pode ser estampado. Escolha outro.";
  if (number) {
    if (!/^\d{1,3}$/.test(number)) errors.number = "Use só números.";
    else if (Number(number) < config.numberMin || Number(number) > config.numberMax) errors.number = `Escolha um número de ${config.numberMin} a ${config.numberMax}.`;
  }
  if (errors.name || errors.number) return { ok: false, errors };
  return { ok: true, value: { name: name || undefined, number: number ? String(Number(number)) : undefined } };
}

/** Identidade do item na sacola: produto + tamanho (SKU) + personalização. */
export const cartLineKey = (sku: string, personalization?: Personalization | null) =>
  personalization && (personalization.name || personalization.number) ? `${sku}|${personalization.name ?? ""}|${personalization.number ?? ""}` : sku;

/** "Nome: LEWIS · Nº 44" para sacola, checkout, pedido, e-mails e fila do fornecedor. */
export function personalizationLabel(personalization?: Personalization | null) {
  if (!personalization) return "";
  return [personalization.name && `Nome: ${personalization.name}`, personalization.number && `Nº ${personalization.number}`].filter(Boolean).join(" · ");
}

/** Cor do texto sobre a cor da camisa: branco ou preto, o de maior contraste (WCAG). */
export function contrastText(hex: string) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#ffffff" : "#000000");
}
