import type { DispatchDays, Fulfillment, Product, ProductOrigin, ProductPackage } from "./types";

// Modelo de venda (refino 2, item 5): estoque próprio x sob encomenda, prazo de envio em dias úteis e pacote para o
// frete. Funções puras (com testes em fulfillment.test.ts), usadas pela página de produto, sacola, checkout e pedido.
// Dados PRIVADOS (custo, link do fornecedor, notas) NÃO ficam aqui nem no Product: só na tabela product_private do
// Supabase, que só o admin lê (ver supabase/migrations/20261023000000_modelo_de_venda.sql).

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = { estoque_proprio: "Pronta entrega", sob_encomenda: "Sob encomenda" };
export const ORIGIN_LABELS: Record<ProductOrigin, string> = { nacional: "Nacional", importado: "Importado" };

/** Padrões para produtos sem os campos (linhas antigas do banco, itens antigos da sacola). */
export const DEFAULT_DISPATCH: DispatchDays = { min: 1, max: 3 };
export const DEFAULT_PACKAGE: ProductPackage = { weightGrams: 400, lengthCm: 30, widthCm: 25, heightCm: 5 };

export const isMadeToOrder = (product: Pick<Product, "fulfillment">) => product.fulfillment === "sob_encomenda";

/** "3 a 5 dias úteis" / "2 dias úteis" / "1 dia útil". */
export function daysLabel({ min, max }: DispatchDays) {
  if (min === max) return min === 1 ? "1 dia útil" : `${min} dias úteis`;
  return `${min} a ${max} dias úteis`;
}

/** Texto da página de produto: só quando o prazo é relevante (sob encomenda ou mais de 3 dias úteis). */
export function dispatchNotice(product: Pick<Product, "fulfillment" | "dispatchDays" | "origin">) {
  const madeToOrder = product.fulfillment === "sob_encomenda";
  const slow = product.dispatchDays.max > DEFAULT_DISPATCH.max;
  if (!madeToOrder && !slow) return null;
  return {
    madeToOrder,
    imported: product.origin === "importado",
    text: `Envio estimado em ${daysLabel(product.dispatchDays)}`,
  };
}

type WithDispatch = { dispatchDays?: DispatchDays };

/** Prazo do pedido = o do item mais lento (o maior máximo; empate → maior mínimo). */
export function slowestDispatch(items: WithDispatch[]): DispatchDays {
  return items.reduce<DispatchDays>((slowest, item) => {
    const days = item.dispatchDays ?? DEFAULT_DISPATCH;
    return days.max > slowest.max || (days.max === slowest.max && days.min > slowest.min) ? days : slowest;
  }, items.length ? { min: 0, max: 0 } : DEFAULT_DISPATCH);
}

/** Itens com prazos diferentes: o pedido pode sair em mais de um pacote. */
export function hasMixedDispatch(items: WithDispatch[]) {
  const keys = new Set(items.map((item) => {
    const days = item.dispatchDays ?? DEFAULT_DISPATCH;
    return `${days.min}-${days.max}`;
  }));
  return keys.size > 1;
}

/** Resumo para sacola e checkout. */
export function dispatchSummary(items: WithDispatch[]) {
  if (!items.length) return null;
  const slowest = slowestDispatch(items);
  return {
    days: slowest,
    text: `Envio em até ${daysLabel(slowest).replace(/^\d+ a /, "")}`,
    range: daysLabel(slowest),
    split: hasMixedDispatch(items),
  };
}

/** Peso e volume somados (frete). Itens empilhados: soma das alturas, maior comprimento e largura. */
export function combinePackages(items: { package?: ProductPackage; quantity: number }[]): ProductPackage {
  return items.reduce<ProductPackage>(
    (total, item) => {
      const pkg = item.package ?? DEFAULT_PACKAGE;
      return {
        weightGrams: total.weightGrams + pkg.weightGrams * item.quantity,
        lengthCm: Math.max(total.lengthCm, pkg.lengthCm),
        widthCm: Math.max(total.widthCm, pkg.widthCm),
        heightCm: total.heightCm + pkg.heightCm * item.quantity,
      };
    },
    { weightGrams: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
  );
}

/** Validação dos campos (admin e mapeamento). */
export function validDispatch(days: DispatchDays) {
  return Number.isInteger(days.min) && Number.isInteger(days.max) && days.min >= 0 && days.max >= days.min && days.max <= 120;
}
