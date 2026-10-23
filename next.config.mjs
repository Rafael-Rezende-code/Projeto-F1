import { securityHeaders } from './lib/security-headers.mjs'

// Fotos enviadas pelo painel admin (Supabase Storage, fase 11): o host do projeto entra nos remotePatterns quando a
// variável existe. Sem Supabase, nada muda.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null
  } catch {
    return null
  }
})()

// Fora do índice até o lançamento (lib/indexing.ts): cabeçalho X-Robots-Tag em TODAS as respostas (páginas, imagens,
// arquivos), além do robots.txt e da meta tag. Some quando NEXT_PUBLIC_ALLOW_INDEXING="true" (lido no build).
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // O `next dev` do Next 16.3 acrescenta um bloco próprio ao CLAUDE.md a cada início; o CLAUDE.md é do projeto.
  agentRules: false,
  async headers() {
    // Segurança (operação, fase 5; lib/security-headers.mjs) em todas as respostas; HSTS só no build de produção.
    const security = securityHeaders({ production: process.env.NODE_ENV === 'production' })
    return [
      { source: '/:path*', headers: [...security, ...(allowIndexing ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }])] },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // 90: fotos dos pilotos (components/drivers-section.tsx). O Next 16 só aceita qualidades listadas aqui.
    qualities: [75, 85, 90],
    // Fotos remotas: produtos/categorias (Unsplash) e a imagem do hero na categoria Racing (Vercel Blob).
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com' },
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : []),
    ],
  },
}

export default nextConfig
