import { z } from "zod";
import { cleanTags } from "@/lib/catalog/filters";
import { brasiliaDate, RACE_TIME_ZONES, zonedToUtc } from "@/lib/calendar";

// Formulário de corrida do painel (loja extra, item 5). A largada é digitada no fuso escolhido e gravada em UTC.
// Testes em race-schema.test.ts.
const ZONES = RACE_TIME_ZONES.map(([zone]) => zone) as [string, ...string[]];

export const raceFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    gpName: z.string().trim().min(3, "Informe o nome do GP.").max(80, "Use até 80 caracteres."),
    circuit: z.string().trim().max(80, "Use até 80 caracteres."),
    country: z.string().trim().max(60, "Use até 60 caracteres."),
    weekendStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a sexta do fim de semana."),
    raceLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe dia e hora da largada."),
    timeZone: z.enum(ZONES, { error: "Escolha o fuso." }),
    collectionSlug: z.string().trim(),
    tags: z.string().max(200),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const start = zonedToUtc(value.raceLocal, value.timeZone);
    if (!start) {
      ctx.addIssue({ code: "custom", path: ["raceLocal"], message: "Data ou hora inválida." });
      return;
    }
    if (value.weekendStart > brasiliaDate(start)) ctx.addIssue({ code: "custom", path: ["weekendStart"], message: "A sexta precisa ser antes da corrida." });
  });

export type RaceForm = z.input<typeof raceFormSchema>;

export const raceRow = (form: z.output<typeof raceFormSchema>) => ({
  gp_name: form.gpName,
  circuit: form.circuit,
  country: form.country,
  weekend_start: form.weekendStart,
  race_start: zonedToUtc(form.raceLocal, form.timeZone)!,
  collection_slug: form.collectionSlug || null,
  tags: cleanTags(form.tags)?.split(",") ?? [],
  active: form.active,
});
