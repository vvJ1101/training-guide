import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YUAN SHOWROOM — Connecting Fashion Culture & Market',
  description: '连接国际设计师品牌与中国市场生态的 Showroom 平台。深圳 · 香港 · 上海。',
  icons: {
    icon: '/showroom/favicon.png',
    apple: '/showroom/apple-icon.png',
  },
  openGraph: {
    title: 'YUAN SHOWROOM',
    description: '连接国际设计师品牌与中国市场生态的 Showroom 平台。深圳 · 香港 · 上海。',
    images: [{ url: '/showroom/images/editorial/about-feature.png', width: 1200, height: 630 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-offwhite text-noir antialiased">{children}</body>
    </html>
  )
}
