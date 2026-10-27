import { z } from "zod";

// Formulário de kit do painel (loja extra, item 2). Testes em kit-schema.test.ts. As regras de banco (2 a 6 produtos,
// 1 a 50%, slug) são as mesmas das constraints da tabela `kits`.
const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const kitFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().max(60, "Use até 60 caracteres.").regex(slug, "Use letras minúsculas, números e hífens (ex.: kit-hamilton)."),
    title: z.string().trim().min(3, "Dê um nome ao kit.").max(80, "Use até 80 caracteres."),
    teamSlug: z.string().trim(),
    driverSlug: z.string().trim(),
    products: z.array(z.string().trim()).max(6, "No máximo 6 peças."),
    percent: z.string().trim(),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const products = value.products.filter(Boolean);
    if (products.length < 2) ctx.addIssue({ code: "custom", path: ["products"], message: "Escolha pelo menos 2 peças." });
    if (new Set(products).size !== products.length) ctx.addIssue({ code: "custom", path: ["products"], message: "Cada peça só pode aparecer uma vez." });
    const percent = Number(value.percent.replace(",", "."));
    if (!Number.isInteger(percent) || percent < 1 || percent > 50) ctx.addIssue({ code: "custom", path: ["percent"], message: "De 1 a 50 (número inteiro)." });
    if (!value.teamSlug && !value.driverSlug) ctx.addIssue({ code: "custom", path: ["teamSlug"], message: "Escolha a equipe ou o piloto (onde o kit aparece)." });
  });

export type KitForm = z.input<typeof kitFormSchema>;

export const kitRow = (form: z.output<typeof kitFormSchema>) => ({
  slug: form.slug,
  title: form.title,
  team_slug: form.teamSlug || null,
  driver_slug: form.driverSlug || null,
  product_slugs: form.products.filter(Boolean),
  discount_percent: Number(form.percent.replace(",", ".")),
  active: form.active,
});
