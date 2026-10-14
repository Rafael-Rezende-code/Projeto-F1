import { describe, expect, it } from "vitest";
import { cartCount, cartReducer, cartSubtotal, freeShippingRemaining, initialCartState, sanitizeItems, type CartItem } from "./reducer";

const base: Omit<CartItem, "quantity"> = {
  sku: "APX-001-M",
  productId: "APX-001",
  slug: "scuderia-racing-jacket",
  name: "Scuderia Racing Jacket",
  size: "M",
  image: "/x.jpg",
  priceCents: 64990,
  stock: 3,
};

describe("cartReducer", () => {
  it("adiciona um item novo", () => {
    const state = cartReducer(initialCartState, { type: "add", item: base, quantity: 1 });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(1);
  });

  it("soma a quantidade quando a mesma variante é adicionada de novo", () => {
    let state = cartReducer(initialCartState, { type: "add", item: base, quantity: 1 });
    state = cartReducer(state, { type: "add", item: base, quantity: 1 });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it("trata tamanhos diferentes como itens diferentes", () => {
    let state = cartReducer(initialCartState, { type: "add", item: base, quantity: 1 });
    state = cartReducer(state, { type: "add", item: { ...base, sku: "APX-001-G", size: "G" }, quantity: 1 });
    expect(state.items).toHaveLength(2);
  });

  it("não deixa passar do estoque ao adicionar", () => {
    let state = cartReducer(initialCartState, { type: "add", item: base, quantity: 2 });
    state = cartReducer(state, { type: "add", item: base, quantity: 5 });
    expect(state.items[0].quantity).toBe(3);
  });

  it("não adiciona variante esgotada nem quantidade zero", () => {
    expect(cartReducer(initialCartState, { type: "add", item: { ...base, stock: 0 }, quantity: 1 }).items).toHaveLength(0);
    expect(cartReducer(initialCartState, { type: "add", item: base, quantity: 0 }).items).toHaveLength(0);
  });

  it("limita setQuantity ao estoque e remove com zero", () => {
    let state = cartReducer(initialCartState, { type: "add", item: base, quantity: 1 });
    state = cartReducer(state, { type: "setQuantity", sku: base.sku, quantity: 10 });
    expect(state.items[0].quantity).toBe(3);
    state = cartReducer(state, { type: "setQuantity", sku: base.sku, quantity: 0 });
    expect(state.items).toHaveLength(0);
  });

  it("remove e limpa", () => {
    let state = cartReducer(initialCartState, { type: "add", item: base, quantity: 1 });
    expect(cartReducer(state, { type: "remove", sku: base.sku }).items).toHaveLength(0);
    state = cartReducer(state, { type: "add", item: { ...base, sku: "B" }, quantity: 1 });
    expect(cartReducer(state, { type: "clear" }).items).toHaveLength(0);
  });

  it("calcula contagem, subtotal e frete grátis", () => {
    let state = cartReducer(initialCartState, { type: "add", item: base, quantity: 2 });
    state = cartReducer(state, { type: "add", item: { ...base, sku: "C", priceCents: 1990, stock: 9 }, quantity: 3 });
    expect(cartCount(state)).toBe(5);
    expect(cartSubtotal(state)).toBe(64990 * 2 + 1990 * 3);
    expect(freeShippingRemaining(10000, 29900)).toBe(19900);
    expect(freeShippingRemaining(30000, 29900)).toBe(0);
  });
});

describe("sanitizeItems (dados do localStorage)", () => {
  it("descarta lixo e corrige quantidades acima do estoque", () => {
    const items = sanitizeItems([{ ...base, quantity: 99 }, { sku: 1 }, null, "x", { ...base, quantity: 1 }]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });
  it("aceita só arrays", () => {
    expect(sanitizeItems({})).toEqual([]);
    expect(sanitizeItems(undefined)).toEqual([]);
  });
});
