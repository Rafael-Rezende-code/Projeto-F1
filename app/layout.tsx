import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { CartProvider } from '@/components/cart'
import { LazyShell } from '@/components/lazy-shell'
import { SearchRoot } from '@/components/search-root'
import { SiteUIProvider } from '@/components/site-ui'
import { fontVariables } from '@/lib/fonts'
import { BRAND, brandTitle } from '@/lib/brand'
import { siteRobots } from '@/lib/indexing'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: brandTitle, template: `%s | ${BRAND.name}` },
  description: SITE_DESCRIPTION,
  // Open Graph básico; a imagem padrão é gerada a partir do nome da marca (app/opengraph-image.tsx). Produto e piloto
  // usam a própria foto. Favicon e apple-icon também são gerados (app/icon.tsx, app/apple-icon.tsx).
  openGraph: { type: 'website', locale: 'pt_BR', siteName: SITE_NAME },
  twitter: { card: 'summary_large_image' },
  // Fora do índice até o lançamento (NEXT_PUBLIC_ALLOW_INDEXING="true"; lib/indexing.ts).
  robots: siteRobots,
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body className="antialiased">
        <SiteUIProvider>
          <CartProvider>
            {children}
            <LazyShell />
            <SearchRoot />
          </CartProvider>
        </SiteUIProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
