import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { CartProvider } from '@/components/cart'
import { ConsentManager } from '@/components/consent'
import { trackingConfigured } from '@/lib/consent'
import { HydrationMark } from '@/components/hydration-mark'
import { WhatsAppButton } from '@/components/whatsapp'
import { LazyShell } from '@/components/lazy-shell'
import { catalog } from '@/lib/catalog'
import { collectionsWithProducts } from '@/lib/catalog/collections'
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body className="antialiased">
        <HydrationMark />
        <SiteUIProvider>
          <CartProvider>
            {children}
            {/* Menu do celular: só as coleções com produto publicado (refino 3). */}
            <LazyShell collections={collectionsWithProducts(await catalog.getProducts()).map(({ collection }) => ({ label: collection.title, href: `/colecoes/${collection.slug}` }))} />
            <SearchRoot />
            <WhatsAppButton />
            {/* Consentimento e GA4/Meta Pixel: só com NEXT_PUBLIC_GA_ID ou NEXT_PUBLIC_META_PIXEL_ID (lib/consent.ts). */}
            {trackingConfigured() && <ConsentManager />}
          </CartProvider>
        </SiteUIProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
