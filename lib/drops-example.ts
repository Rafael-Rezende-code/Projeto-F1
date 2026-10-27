import type { Drop } from "@/lib/drops";

// EXEMPLO-DROPS-DEV. Só para ver drops e pré-venda no ambiente de DESENVOLVIMENTO sem banco: lib/drops-store.ts e o
// catálogo do seed importam este arquivo apenas quando NODE_ENV === "development" (no build de produção o import some;
// lib/drops-build.test.ts confere). NÃO são lançamentos reais: datas relativas a agora.
export function exampleDrops(now = Date.now()): Drop[] {
  return [
    {
      id: "exemplo-1",
      slug: "exemplo-em-breve",
      title: "[EXEMPLO] Drop de exemplo",
      description: "Drop inventado para testar a página em desenvolvimento.",
      cover: null,
      launchAt: new Date(now + 3 * 86_400_000).toISOString(),
      mode: "lancamento",
      shipEstimate: null,
      perOrderLimit: 1,
      productSlugs: ["bone-hamilton"],
      active: true,
    },
    {
      id: "exemplo-2",
      slug: "exemplo-pre-venda",
      title: "[EXEMPLO] Pré-venda de exemplo",
      description: "Pré-venda inventada para testar a página em desenvolvimento.",
      cover: null,
      launchAt: new Date(now - 86_400_000).toISOString(),
      mode: "pre_venda",
      shipEstimate: "a partir de 20/12",
      perOrderLimit: 2,
      productSlugs: ["poster-hamilton"],
      active: true,
    },
  ];
}
