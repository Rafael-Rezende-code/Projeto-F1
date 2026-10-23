"use client";

import { useEffect } from "react";

// O Supabase devolve erros de autenticação à raiz do site (?error=... ou #error=...). Quem chega assim vai para a tela de
// entrada do painel, sem mensagem técnica na URL.
const AUTH_ERROR = /(^|[?#&])error(_code|_description)?=/;

export function AuthErrorRedirect() {
  useEffect(() => {
    if (AUTH_ERROR.test(window.location.search) || AUTH_ERROR.test(window.location.hash)) window.location.replace("/admin/entrar");
  }, []);
  return null;
}
