import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Vercel'de otomatik optimize edilir
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Büyük dosya yüklemeleri için
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
}

export default nextConfig