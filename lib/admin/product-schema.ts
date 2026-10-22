import { z } from "zod";

// Formulário de produto do painel (fase 11). Preços chegam em REAIS (texto "1.234,56" ou "1234.56") e viram centavos.
export const toCents = (value: string) => {
  const clean = value.trim().replace(/\s|R\$/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : NaN;
};

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const productFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(3, "Informe o nome."),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
    description: z.string().trim().min(10, "Escreva uma descrição (parágrafos separados por linha em branco)."),
    details: z.array(z.object({ label: z.string().trim().min(1), value: z.string().trim().min(1) })).max(12),
    detailsPending: z.boolean(),
    price: z.string(),
    compareAtPrice: z.string(),
    categorySlug: z.string().min(1, "Escolha a categoria."),
    teamSlug: z.string(),
    driverSlug: z.string(),
    tags: z.string(),
    isNew: z.boolean(),
    featured: z.boolean(),
    status: z.enum(["draft", "active", "archived"]),
    variants: z
      .array(
        z.object({
          sku: z.string().trim().min(2, "SKU obrigatório.").regex(/^[A-Za-z0-9-_.]+$/, "SKU sem espaços."),
          size: z.string().trim().min(1, "Tamanho obrigatório."),
          color: z.string().trim(),
          stock: z.number().int().min(0, "Estoque não pode ser negativo."),
        }),
      )
      .min(1, "Cadastre pelo menos uma variante (tamanho)."),
    images: z.array(z.object({ src: z.string().url("Imagem inválida."), alt: z.string().trim(), storagePath: z.string().nullable() })).max(12),
    // Modelo de venda (refino 2, item 5): público.
    fulfillment: z.enum(["estoque_proprio", "sob_encomenda"]),
    dispatchMin: z.number().int("Use dias inteiros.").min(0, "Mínimo inválido."),
    dispatchMax: z.number().int("Use dias inteiros.").max(120, "Até 120 dias úteis."),
    origin: z.enum(["nacional", "importado"]),
    weightGrams: z.number().int().min(1, "Informe o peso (gramas)."),
    lengthCm: z.number().positive("Medida inválida."),
    widthCm: z.number().positive("Medida inválida."),
    heightCm: z.number().positive("Medida inválida."),
    // PRIVADO (tabela product_private, só admin): custo e fornecedor. Nunca vai para a loja.
    cost: z.string(),
    supplierShipping: z.string(),
    supplierUrl: z.union([z.literal(""), z.string().trim().url("Link inválido (comece com https://).")]),
    notes: z.string().max(2000),
  })
  .superRefine((value, ctx) => {
    const price = toCents(value.price);
    if (price === null || Number.isNaN(price)) ctx.addIssue({ code: "custom", path: ["price"], message: "Informe o preço (ex.: 199,90)." });
    const compare = toCents(value.compareAtPrice);
    if (Number.isNaN(compare)) ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Preço \"de\" inválido." });
    else if (compare !== null && price !== null && !Number.isNaN(price) && compare <= price)
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "O preço \"de\" precisa ser maior que o preço." });
    if (value.dispatchMax < value.dispatchMin) ctx.addIssue({ code: "custom", path: ["dispatchMax"], message: "O máximo precisa ser maior ou igual ao mínimo." });
    for (const key of ["cost", "supplierShipping"] as const)
      if (Number.isNaN(toCents(value[key]))) ctx.addIssue({ code: "custom", path: [key], message: "Valor inválido (ex.: 89,90)." });
    const skus = value.variants.map((variant) => variant.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) ctx.addIssue({ code: "custom", path: ["variants"], message: "Há SKUs repetidos." });
    if (value.status === "active" && value.images.length === 0) ctx.addIssue({ code: "custom", path: ["images"], message: "Para publicar, envie pelo menos uma foto." });
  });

export type ProductForm = z.infer<typeof productFormSchema>;
