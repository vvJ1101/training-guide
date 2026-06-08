import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YUAN SHOWROOM — 连接国际设计师品牌与中国市场生态',
  description: '深圳·香港·上海 | 品牌代理、市场开拓、运营管理、全域营销与战略投资于一体的系统性品牌管理支持平台。50+合作品牌，3000+全球买手渠道。',
  keywords: ['YUAN SHOWROOM', '设计师品牌', 'Showroom', '订货会', '品牌管理', '时尚买手', '上海时装周'],
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://yuanshowroom.cn/showroom/' },
  icons: { icon: '/showroom/favicon.png', apple: '/showroom/apple-icon.png' },
  openGraph: {
    title: 'YUAN SHOWROOM — 连接创意与市场的桥梁',
    description: '集品牌代理、市场开拓、运营管理、全域营销与战略投资于一体的系统性品牌管理支持平台。50+合作品牌，3000+全球买手渠道。',
    url: 'https://yuanshowroom.cn/showroom/',
    siteName: 'YUAN SHOWROOM',
    images: [{ url: '/showroom/images/home/hero-main.png', width: 1200, height: 630 }],
    locale: 'zh_CN',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'YUAN SHOWROOM',
              description: '连接国际设计师品牌与中国市场生态的系统性品牌管理支持平台',
              url: 'https://yuanshowroom.cn/showroom/',
              logo: 'https://yuanshowroom.cn/showroom/favicon.png',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'heshiya@yuanshowroom.vip',
                contactType: 'Brand Cooperation',
              },
              address: {
                '@type': 'PostalAddress',
                addressLocality: '深圳',
                addressRegion: '广东',
                addressCountry: 'CN',
              },
              sameAs: ['https://yuanshowroom.cn/showroom/'],
            }),
          }}
        />
      </head>
      <body className="bg-offwhite text-neutral-900 antialiased">{children}</body>
    </html>
  )
}
