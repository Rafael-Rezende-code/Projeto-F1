// Data por extenso em português ("22 de outubro de 2026"), a partir de AAAA-MM-DD (sem fuso: meio-dia UTC).
export const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
