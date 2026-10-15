import * as React from "react";
import type { ReactNode } from "react";

// Transição entre páginas com View Transitions (React <ViewTransition>, do React canary que o Next 16 usa).
// O mesmo `name` em duas páginas faz o elemento "voar" de uma para a outra na navegação (ex.: imagem do card de
// produto → imagem principal da página do produto). Os nomes precisam ser únicos na página: não use o mesmo produto
// duas vezes com transição na mesma tela. Sem suporte (navegador ou React), renderiza só o conteúdo.
const VT = (React as unknown as { ViewTransition?: React.ComponentType<{ name?: string; children: ReactNode }> }).ViewTransition;

export function SharedTransition({ name, children }: { name?: string; children: ReactNode }) {
  if (!VT || !name) return <>{children}</>;
  return <VT name={name}>{children}</VT>;
}

export const productTransitionName = (slug: string) => `produto-${slug}`;
export const driverTransitionName = (slug: string) => `piloto-${slug}`;
