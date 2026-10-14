/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
}

export default nextConfig
