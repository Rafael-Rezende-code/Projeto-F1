import { z } from "zod";
import { zonedToUtc } from "@/lib/calendar";

// Formulário de drop do painel (loja extra, item 6). O lançamento é digitado em horário de Brasília e gravado em UTC.
// Testes em drop-schema.test.ts.
export const dropFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().max(60, "Use até 60 caracteres.").regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
    title: z.string().trim().min(3, "Dê um nome ao drop.").max(80, "Use até 80 caracteres."),
    description: z.string().trim().max(600, "Use até 600 caracteres."),
    cover: z.union([z.literal(""), z.string().trim().regex(/^(https:\/\/|\/)\S+$/, "Use um link https:// ou um caminho /images/...")]),
    launchLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe dia e hora do lançamento."),
    mode: z.enum(["lancamento", "pre_venda"]),
    shipEstimate: z.string().trim().max(80, "Use até 80 caracteres."),
    perOrderLimit: z.union([z.literal(""), z.string().regex(/^\d{1,2}$/, "De 1 a 99 (ou vazio = sem limite).")]),
    products: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)).max(40, "No máximo 40 peças."),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!zonedToUtc(value.launchLocal, "America/Sao_Paulo")) ctx.addIssue({ code: "custom", path: ["launchLocal"], message: "Data ou hora inválida." });
    if (!value.products.length) ctx.addIssue({ code: "custom", path: ["products"], message: "Escolha pelo menos uma peça." });
    if (value.perOrderLimit !== "" && Number(value.perOrderLimit) < 1) ctx.addIssue({ code: "custom", path: ["perOrderLimit"], message: "De 1 a 99 (ou vazio = sem limite)." });
    if (value.mode === "pre_venda" && !value.shipEstimate) ctx.addIssue({ code: "custom", path: ["shipEstimate"], message: "Na pré-venda, informe a previsão de envio." });
  });

export type DropForm = z.input<typeof dropFormSchema>;

export const dropRow = (form: z.output<typeof dropFormSchema>) => ({
  slug: form.slug,
  title: form.title,
  description: form.description,
  cover: form.cover || null,
  launch_at: zonedToUtc(form.launchLocal, "America/Sao_Paulo")!,
  mode: form.mode,
  ship_estimate: form.shipEstimate || null,
  per_order_limit: form.perOrderLimit === "" ? null : Number(form.perOrderLimit),
  product_slugs: [...new Set(form.products)],
  active: form.active,
});
