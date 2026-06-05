'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  docCount: number
  deptCount: number
  companyCount: number
  recentDocs: {
    id: string; title: string; slug: string; category: string; department: string
    audienceSlug: string; updatedAt: string
  }[]
}

const catLabels: Record<string, string> = { training: '培训资料', sop: 'SOP', reference: '企业制度', brand: '品牌资产' }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/showroom/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 md:p-10 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">工作台</h1>
          <p className="text-[0.85rem] text-neutral-500 font-normal">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 md:p-10 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">工作台</h1>
        <p className="text-[0.85rem] text-neutral-500 font-normal">欢迎回来。以下是最新概览。</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '文档总数', value: String(data?.docCount ?? 0) },
          { label: '公司', value: String(data?.companyCount ?? 0) },
          { label: '部门', value: String(data?.deptCount ?? 0) },
          { label: '最近更新', value: String(data?.recentDocs?.length ?? 0) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-lg p-5">
            <p className="text-[1.5rem] font-semibold text-neutral-900">{s.value}</p>
            <p className="text-[0.78rem] text-neutral-500 font-normal mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg">
        <div className="px-5 py-3 border-b border-neutral-100">
          <h2 className="text-[0.82rem] font-medium text-neutral-700">最近文档</h2>
        </div>
        {data?.recentDocs?.length ? (
          <div className="divide-y divide-neutral-100">
            {data.recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/internal/docs/${doc.audienceSlug}/${encodeURIComponent(doc.slug)}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors no-underline"
              >
                <div>
                  <p className="text-[0.85rem] font-normal text-neutral-800">{doc.title}</p>
                  <p className="text-[0.72rem] text-neutral-400 font-normal mt-0.5">{doc.department} · {catLabels[doc.category] || doc.category}</p>
                </div>
                <span className="text-[0.72rem] text-neutral-400 font-normal shrink-0 ml-4">
                  {new Date(doc.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-[0.82rem] text-neutral-400">暂无文档</p>
        )}
      </div>
    </div>
  )
}
