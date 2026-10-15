import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { CartProvider } from '@/components/cart'
import { MobileDock } from '@/components/mobile-dock'
import { MobileMenu } from '@/components/mobile-menu'
import { SiteUIProvider } from '@/components/site-ui'
import { fontVariables } from '@/lib/fonts'
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Apex — Feita para pilotos', template: '%s | Apex' },
  description: SITE_DESCRIPTION,
  // Open Graph básico; páginas de produto/piloto trocam a imagem. Imagem padrão: a do hero.
  openGraph: { type: 'website', locale: 'pt_BR', siteName: SITE_NAME, images: [{ url: OG_IMAGE, alt: 'Apex — Feita para pilotos' }] },
  twitter: { card: 'summary_large_image' },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
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
            <MobileDock />
            <MobileMenu />
          </CartProvider>
        </SiteUIProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
