'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface DocRef {
  id: string; title: string; audienceSlug: string; slug: string
  department: string; category: string
}

interface RecentDoc extends DocRef {
  updatedAt: string
}

interface Props {
  recentDocs: RecentDoc[]
  popularDocs: DocRef[]
}

function useLocalStorageList(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export function WorkspaceSection({ recentDocs, popularDocs }: Props) {
  const recentVisitIds = useLocalStorageList('yuan_recent_visits')
  const favoriteIds = useLocalStorageList('yuan_favorites')

  // To-learn = popular - already visited
  const toLearnCount = useMemo(() => {
    const seen = new Set(recentVisitIds)
    return popularDocs.filter(d => !seen.has(d.id)).length
  }, [popularDocs, recentVisitIds])

  return (
    <section className="mb-10">
      <h2 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">我的工作区</h2>

      {/* Work cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors">
          <p className="text-[1.5rem] font-semibold text-neutral-900">{toLearnCount}</p>
          <p className="text-[0.72rem] text-neutral-500 font-normal mt-0.5">待学习文档</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors">
          <p className="text-[1.5rem] font-semibold text-neutral-900">{recentVisitIds.length}</p>
          <p className="text-[0.72rem] text-neutral-500 font-normal mt-0.5">最近访问</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors">
          <p className="text-[1.5rem] font-semibold text-neutral-900">{favoriteIds.length}</p>
          <p className="text-[0.72rem] text-neutral-500 font-normal mt-0.5">收藏文档</p>
        </div>
      </div>

      {/* Recent updates */}
      <div>
        <p className="text-[0.72rem] font-medium text-neutral-500 mb-2">最近更新</p>
        <div className="space-y-0.5">
          {recentDocs.slice(0, 5).map(doc => (
            <Link
              key={doc.id}
              href={`/internal/docs/${doc.audienceSlug || 'general'}/${encodeURIComponent(doc.slug)}`}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white hover:border-neutral-200 border border-transparent transition-colors no-underline group"
            >
              <span className="text-[0.82rem] text-neutral-700 group-hover:text-neutral-900 font-normal truncate">{doc.title}</span>
              <span className="text-[0.7rem] text-neutral-400 shrink-0 ml-3">{relativeTime(doc.updatedAt)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
