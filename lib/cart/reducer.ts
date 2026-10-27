import type { DispatchDays, Fulfillment } from "@/lib/catalog/types";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "./config";
import { cartLineKey, normalizeName, type Personalization } from "@/lib/personalization";

// Lógica pura da sacola (testada em reducer.test.ts). Um item por variante (SKU = produto + tamanho) e personalização
// (loja extra, item 3: `key` = SKU + nome + número). A quantidade fica sempre entre 1 e o estoque da variante.
export type CartItem = {
  /** Identidade do item (lib/personalization.ts, cartLineKey). */
  key: string;
  sku: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  image: string;
  priceCents: number;
  /** Estoque da variante no momento em que foi adicionada (o checkout revalida no servidor). */
  stock: number;
  quantity: number;
  /** Modelo de venda (refino 2): prazo de envio do item. Itens antigos sem o campo usam o padrão. */
  fulfillment?: Fulfillment;
  dispatchDays?: DispatchDays;
  /** Nome e número nas costas (só produtos personalizáveis) e o adicional por unidade. O servidor recalcula. */
  personalization?: Personalization;
  feeCents?: number;
};

/** hydrated: a sacola salva (localStorage) já foi lida. Antes disso ela aparece vazia, igual ao HTML do servidor. */
export type CartState = { items: CartItem[]; hydrated: boolean };

export type CartAction =
  | { type: "add"; item: Omit<CartItem, "quantity" | "key">; quantity: number }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "hydrate"; items: CartItem[] };

export const initialCartState: CartState = { items: [], hydrated: false };

const clamp = (quantity: number, stock: number) => Math.max(0, Math.min(Math.floor(quantity), stock));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      if (action.quantity <= 0 || action.item.stock <= 0) return state;
      const key = cartLineKey(action.item.sku, action.item.personalization);
      const existing = state.items.find((item) => item.key === key);
      if (existing) {
        const quantity = clamp(existing.quantity + action.quantity, action.item.stock);
        return {
          ...state,
          items: state.items.map((item) => (item.key === key ? { ...item, ...action.item, key, quantity } : item)),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, key, quantity: clamp(action.quantity, action.item.stock) }] };
    }
    case "setQuantity": {
      const target = state.items.find((item) => item.key === action.key);
      if (!target) return state;
      const quantity = clamp(action.quantity, target.stock);
      if (quantity <= 0) return { ...state, items: state.items.filter((item) => item.key !== action.key) };
      return { ...state, items: state.items.map((item) => (item.key === action.key ? { ...item, quantity } : item)) };
    }
    case "remove":
      return { ...state, items: state.items.filter((item) => item.key !== action.key) };
    case "clear":
      return { ...state, items: [] };
    case "hydrate":
      return { items: sanitizeItems(action.items), hydrated: true };
    default:
      return state;
  }
}

/** Valida o que veio do localStorage: descarta itens malformados e corrige quantidades. */
export function sanitizeItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CartItem[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const item = value as Partial<CartItem>;
    if (
      typeof item.sku !== "string" ||
      typeof item.productId !== "string" ||
      typeof item.slug !== "string" ||
      typeof item.name !== "string" ||
      typeof item.size !== "string" ||
      typeof item.image !== "string" ||
      !Number.isInteger(item.priceCents) ||
      !Number.isInteger(item.stock) ||
      !Number.isFinite(item.quantity)
    )
      continue;
    const quantity = clamp(item.quantity as number, item.stock as number);
    const days = item.dispatchDays;
    const validDays = days && Number.isInteger(days.min) && Number.isInteger(days.max) && days.min >= 0 && days.max >= days.min;
    const fulfillment = item.fulfillment === "sob_encomenda" || item.fulfillment === "estoque_proprio" ? item.fulfillment : undefined;
    // Personalização vinda do armazenamento: só texto no formato estampável; o servidor confere tudo de novo.
    const raw = item.personalization;
    const name = raw && typeof raw.name === "string" ? normalizeName(raw.name).trim().slice(0, 20) : "";
    const number = raw && typeof raw.number === "string" && /^\d{1,3}$/.test(raw.number) ? raw.number : "";
    const personalization = name || number ? { name: name || undefined, number: number || undefined } : undefined;
    const feeCents = personalization && Number.isInteger(item.feeCents) && (item.feeCents as number) >= 0 ? item.feeCents : personalization ? 0 : undefined;
    const key = cartLineKey(item.sku, personalization);
    if (quantity > 0 && !items.some((other) => other.key === key))
      items.push({ ...(item as CartItem), key, quantity, fulfillment, dispatchDays: validDays ? { min: days.min, max: days.max } : undefined, personalization, feeCents });
  }
  return items;
}

export const cartCount = (state: CartState) => state.items.reduce((sum, item) => sum + item.quantity, 0);
export const cartSubtotal = (state: CartState) => state.items.reduce((sum, item) => sum + (item.priceCents + (item.feeCents ?? 0)) * item.quantity, 0);
/** Quanto falta para o frete grátis (0 quando já atingiu ou quando a loja não tem frete grátis configurado). */
export const freeShippingRemaining = (subtotalCents: number, threshold: number | null = FREE_SHIPPING_THRESHOLD_CENTS) =>
  threshold === null ? 0 : Math.max(0, threshold - subtotalCents);
