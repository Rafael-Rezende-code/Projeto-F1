import { describe, expect, it } from "vitest";
import { productFormSchema, slugify, toCents } from "./product-schema";

const base = {
  name: "Camiseta Teste",
  slug: "camiseta-teste",
  description: "Uma descrição longa o bastante.",
  details: [],
  detailsPending: true,
  price: "199,90",
  compareAtPrice: "",
  categorySlug: "teamwear",
  teamSlug: "",
  driverSlug: "",
  tags: "",
  isNew: false,
  featured: false,
  status: "draft" as const,
  variants: [{ sku: "T-M", size: "M", color: "", stock: 3 }],
  images: [],
  fulfillment: "sob_encomenda" as const,
  dispatchMin: 15,
  dispatchMax: 30,
  origin: "importado" as const,
  weightGrams: 900,
  lengthCm: 20,
  widthCm: 20,
  heightCm: 20,
  cost: "120,00",
  supplierShipping: "",
  supplierUrl: "",
  notes: "",
};

describe("formulário de produto do painel", () => {
  it("converte reais em centavos", () => {
    expect(toCents("199,90")).toBe(19990);
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("R$ 59.9")).toBe(5990);
    expect(toCents("")).toBeNull();
    expect(toCents("abc")).toBeNaN();
  });

  it("gera slug sem acento", () => expect(slugify("Boné Fórmula 1 — Edição")).toBe("bone-formula-1-edicao"));

  it("aceita rascunho sem foto e recusa publicar sem foto", () => {
    expect(productFormSchema.safeParse(base).success).toBe(true);
    const published = productFormSchema.safeParse({ ...base, status: "active" });
    expect(published.success).toBe(false);
  });

  it("preço \"de\" maior que o preço, SKUs únicos, estoque não negativo", () => {
    expect(productFormSchema.safeParse({ ...base, compareAtPrice: "150" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, compareAtPrice: "249,90" }).success).toBe(true);
    expect(productFormSchema.safeParse({ ...base, variants: [base.variants[0], { ...base.variants[0] }] }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, variants: [{ ...base.variants[0], stock: -1 }] }).success).toBe(false);
  });

  it("modelo de venda e dados privados: prazo coerente, link e valores válidos", () => {
    expect(productFormSchema.safeParse({ ...base, dispatchMin: 10, dispatchMax: 5 }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, supplierUrl: "fornecedor" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, supplierUrl: "https://fornecedor.exemplo/p/1" }).success).toBe(true);
    expect(productFormSchema.safeParse({ ...base, cost: "abc" }).success).toBe(false);
  });
});
