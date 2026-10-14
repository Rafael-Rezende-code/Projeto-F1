import { FREE_SHIPPING_THRESHOLD_CENTS } from "./config";

// Lógica pura da sacola (testada em reducer.test.ts). Um item por variante (SKU = produto + tamanho).
// A quantidade fica sempre entre 1 e o estoque da variante.
export type CartItem = {
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
};

/** hydrated: a sacola salva (localStorage) já foi lida. Antes disso ela aparece vazia, igual ao HTML do servidor. */
export type CartState = { items: CartItem[]; hydrated: boolean };

export type CartAction =
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "setQuantity"; sku: string; quantity: number }
  | { type: "remove"; sku: string }
  | { type: "clear" }
  | { type: "hydrate"; items: CartItem[] };

export const initialCartState: CartState = { items: [], hydrated: false };

const clamp = (quantity: number, stock: number) => Math.max(0, Math.min(Math.floor(quantity), stock));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      if (action.quantity <= 0 || action.item.stock <= 0) return state;
      const existing = state.items.find((item) => item.sku === action.item.sku);
      if (existing) {
        const quantity = clamp(existing.quantity + action.quantity, action.item.stock);
        return {
          ...state,
          items: state.items.map((item) => (item.sku === action.item.sku ? { ...item, ...action.item, quantity } : item)),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: clamp(action.quantity, action.item.stock) }] };
    }
    case "setQuantity": {
      const target = state.items.find((item) => item.sku === action.sku);
      if (!target) return state;
      const quantity = clamp(action.quantity, target.stock);
      if (quantity <= 0) return { ...state, items: state.items.filter((item) => item.sku !== action.sku) };
      return { ...state, items: state.items.map((item) => (item.sku === action.sku ? { ...item, quantity } : item)) };
    }
    case "remove":
      return { ...state, items: state.items.filter((item) => item.sku !== action.sku) };
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
    if (quantity > 0 && !items.some((other) => other.sku === item.sku)) items.push({ ...(item as CartItem), quantity });
  }
  return items;
}

export const cartCount = (state: CartState) => state.items.reduce((sum, item) => sum + item.quantity, 0);
export const cartSubtotal = (state: CartState) => state.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
/** Quanto falta para o frete grátis (0 quando já atingiu). */
export const freeShippingRemaining = (subtotalCents: number, threshold = FREE_SHIPPING_THRESHOLD_CENTS) =>
  Math.max(0, threshold - subtotalCents);
