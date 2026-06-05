/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/showroom',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'xlsx'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
}

module.exports = nextConfig
