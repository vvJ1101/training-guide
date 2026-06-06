'use client'

import { useEffect, useState } from 'react'
import {
  HeroSearch, WorkspaceSection, StatsCards,
  AICapabilities, PopularKnowledge, QuickActions,
} from '@/components/internal/dashboard'

interface DocRef {
  id: string; title: string; slug: string; category: string
  department: string; audienceSlug: string; updatedAt?: string
}

interface DashboardData {
  docCount: number; deptCount: number; companyCount: number
  aiDocCount: number; faqCount: number; chatCount: number
  mermaidCount: number; knowledgeCoverage: number
  recentDocs: DocRef[]
  popularDocs: DocRef[]
  newEmployeeDocs: DocRef[]
}

const suggestedQuestions = [
  '如何申请报销？',
  '商品审核流程是什么？',
  '订货会时间节点有哪些？',
  '员工手册在哪里查看？',
  'ERP 系统如何操作？',
  '品牌方如何对账？',
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [role, setRole] = useState('staff')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/showroom/api/dashboard').then(r => r.json()),
      fetch('/showroom/api/auth/me').then(r => r.json()),
    ])
      .then(([d, u]) => {
        if (d && typeof d.docCount === 'number') setData(d)
        if (u?.role) setRole(u.role)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 md:p-10 max-w-[960px] mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            {[0, 150, 300].map(delay => (
              <span key={delay} className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 md:p-10 max-w-[960px] mx-auto">
        <p className="text-[0.85rem] text-neutral-500 text-center py-20">加载失败，请刷新重试</p>
      </div>
    )
  }

  // Separate reference docs for the "latest policies" section
  const referenceDocs = data.recentDocs?.filter(d => d.category === 'reference') || []

  return (
    <div className="p-6 md:p-10 max-w-[960px] mx-auto">
      {/* ── Screen 1: AI Search ── */}
      <HeroSearch
        suggestedQuestions={suggestedQuestions}
        popularDocs={data.popularDocs || []}
      />

      {/* ── Screen 2: My Workspace ── */}
      <WorkspaceSection
        recentDocs={(data.recentDocs || []).map(d => ({ ...d, updatedAt: d.updatedAt || '' }))}
        popularDocs={data.popularDocs || []}
      />

      {/* ── Screen 3: Stats ── */}
      <StatsCards
        docCount={data.docCount}
        companyCount={data.companyCount}
        deptCount={data.deptCount}
        faqCount={data.faqCount}
      />

      {/* ── Screen 4: AI Capabilities ── */}
      <AICapabilities
        aiDocCount={data.aiDocCount}
        mermaidCount={data.mermaidCount}
        faqCount={data.faqCount}
        chatCount={data.chatCount}
        knowledgeCoverage={data.knowledgeCoverage}
      />

      {/* ── Screen 5: Popular Knowledge ── */}
      <PopularKnowledge
        popularDocs={data.popularDocs || []}
        newEmployeeDocs={data.newEmployeeDocs || []}
        recentDocs={data.recentDocs || []}
        referenceDocs={referenceDocs}
      />

      {/* ── Screen 6: Quick Actions ── */}
      <QuickActions role={role} />
    </div>
  )
}
