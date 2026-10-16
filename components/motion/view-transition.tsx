import * as React from "react";
import type { ReactNode } from "react";

// Transição entre páginas com View Transitions (React <ViewTransition>, do React canary que o Next 16 usa).
// O mesmo `name` em duas páginas faz o elemento "voar" de uma para a outra na navegação (ex.: imagem do card de
// produto → imagem principal da página do produto). Os nomes precisam ser únicos na página: não use o mesmo produto
// duas vezes com transição na mesma tela. Sem suporte (navegador ou React), renderiza só o conteúdo.
// `crossfade={false}`: sem a mistura de opacidade entre o elemento antigo e o novo; o novo aparece inteiro desde o
// primeiro quadro e só o movimento (posição/tamanho) anima. Usado na foto dos pilotos: a mistura com o card (que tem
// gradiente escuro e o nome) deixava a foto esmaecida durante a transição.
const VT = (React as unknown as { ViewTransition?: React.ComponentType<{ name?: string; children: ReactNode }> }).ViewTransition;

export function SharedTransition({ name, crossfade = true, children }: { name?: string; crossfade?: boolean; children: ReactNode }) {
  if (!VT || !name) return <>{children}</>;
  return (
    <>
      {!crossfade && (
        <style>{`::view-transition-old(${name}){animation:none;opacity:0}::view-transition-new(${name}){animation:none;opacity:1}`}</style>
      )}
      <VT name={name}>{children}</VT>
    </>
  );
}

export const productTransitionName = (slug: string) => `produto-${slug}`;
export const driverTransitionName = (slug: string) => `piloto-${slug}`;
