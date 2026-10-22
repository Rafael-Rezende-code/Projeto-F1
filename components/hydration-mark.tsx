"use client";

import { useEffect } from "react";

// Marca `data-hydrated` no <html> DEPOIS da hidratação (num efeito: não entra na comparação do React). Os testes e2e
// esperam por ela antes de clicar (e2e/fixtures.ts): clique antes da hidratação se perdia no dev.
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);
  return null;
}
