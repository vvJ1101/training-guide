import type { Metadata } from 'next'
import { InternalNav } from '@/components/internal/internal-nav'

export const metadata: Metadata = { title: '文档阅读', robots: 'noindex, nofollow' }

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <InternalNav />
      {children}
    </div>
  )
}
