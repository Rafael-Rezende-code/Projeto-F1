// Cabeçalhos de segurança (operação, fase 5), aplicados a TODAS as respostas pelo next.config.mjs. Testes em
// lib/security-headers.test.ts. CSP (Content-Security-Policy) ainda NÃO: o site usa scripts inline (fonte do hero, GA4,
// Meta Pixel, Mercado Pago Brick) e uma CSP mal calibrada quebra o checkout; ver docs/backend/seguranca.md (melhoria futura).
export function securityHeaders({ production }) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Nada de câmera, microfone, localização, USB etc. "payment" fica de fora: o Brick do Mercado Pago roda em iframe próprio.
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    // HSTS só em produção (no localhost, http). Sem "preload": entrar na lista dos navegadores é difícil de desfazer.
    ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
  ]
}
