/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // 90: fotos dos pilotos (components/drivers-section.tsx). O Next 16 só aceita qualidades listadas aqui.
    qualities: [75, 90],
  },
}

export default nextConfig
