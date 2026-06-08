'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DocRef { id: string; title: string; slug: string; category: string; department: string; audienceSlug: string }

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<DocRef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/showroom/api/bookmarks')
      .then(r => r.json())
      .then(d => {
        if (d?.bookmarks) {
          setBookmarks(d.bookmarks.map((b: any) => ({
            id: b.id, title: b.title, slug: b.slug, category: b.category,
            department: b.ownerDept?.name || '',
            audienceSlug: (b as any).audiences?.[0]?.department?.slug || ''
          })))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-10"><div className="flex gap-2">{[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}</div></div>
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-[1.4rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">⭐ 收藏文档</h1>
      <p className="text-[0.85rem] text-neutral-500 mb-8">{bookmarks.length} 篇收藏</p>

      {bookmarks.length > 0 ? (
        <div className="space-y-2">
          {bookmarks.map(d => (
            <Link key={d.id} href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`}
              className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 hover:shadow-sm transition-all no-underline group">
              <div className="min-w-0">
                <p className="text-[0.88rem] text-neutral-800 font-medium group-hover:text-neutral-900 truncate">{d.title}</p>
                <p className="text-[0.75rem] text-neutral-400 mt-1">{d.department} · {d.category}</p>
              </div>
              <span className="text-amber-500 ml-3 shrink-0">⭐</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl">
          <p className="text-[1.5rem] mb-2">⭐</p>
          <p className="text-[0.9rem] text-neutral-500">还没有收藏任何文档</p>
          <p className="text-[0.78rem] text-neutral-400 mt-1">打开文档页面，点击「☆ 收藏」即可添加到此处</p>
        </div>
      )}
    </div>
  )
}
