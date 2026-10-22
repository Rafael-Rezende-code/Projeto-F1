"use client";

import { useEffect } from "react";

// Erro no próprio layout raiz (raro): substitui a página inteira, então traz o próprio <html> e estilos mínimos
// (o CSS do site pode não ter carregado). Mesmo tom do error.tsx.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff", color: "#000", fontFamily: "system-ui, sans-serif", colorScheme: "light" }}>
        <main style={{ maxWidth: 520, padding: "96px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "#b94f01" }}>Bandeira vermelha</p>
          <h1 style={{ margin: "16px 0 0", fontSize: 44, lineHeight: 1, letterSpacing: "-0.04em" }}>Algo saiu da pista.</h1>
          <p style={{ margin: "24px auto 0", maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: "rgba(0,0,0,0.6)" }}>
            Tivemos um problema para abrir o site. Tente de novo; se continuar, volte para a home.
          </p>
          <div style={{ marginTop: 36, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={reset} style={{ border: 0, borderRadius: 12, background: "#b94f01", color: "#fff", padding: "12px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Tentar de novo
            </button>
            {/* <a> simples: o roteador do Next pode não estar disponível quando o layout raiz falhou */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.2)", color: "#000", padding: "12px 24px", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Voltar para a home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
