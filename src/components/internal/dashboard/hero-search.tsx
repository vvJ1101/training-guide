'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  id: string; title: string; audienceSlug: string; slug: string
  department: string; category: string; snippet: string
}

interface Props {
  suggestedQuestions: string[]
  popularDocs: { id: string; title: string; audienceSlug: string; slug: string }[]
}

const catLabels: Record<string, string> = { training: '培训', sop: 'SOP', reference: '制度', brand: '品牌' }

export function HeroSearch({ suggestedQuestions, popularDocs }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [focused, setFocused] = useState(false)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // 300ms debounce search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/showroom/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.results)) {
        setResults(data.results.slice(0, 6))
      }
    } catch { /* silent */ }
    setSearching(false)
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, doSearch])

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/internal/search?q=${encodeURIComponent(query.trim())}`)
      setFocused(false)
    }
  }

  const showDropdown = focused && (query.length >= 2 || results.length > 0)

  return (
    <section className="pt-12 pb-10 md:pt-16 md:pb-14" ref={containerRef}>
      <div className="max-w-[680px] mx-auto text-center">
        {/* Heading */}
        <h2 className="text-[1.65rem] md:text-[1.85rem] font-semibold tracking-[-0.03em] text-neutral-900 mb-2">
          ✨ AI 知识助手
        </h2>
        <p className="text-[0.9rem] text-neutral-500 font-normal mb-8">
          快速查找制度、流程、SOP 和业务知识
        </p>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className={`flex items-center bg-white border rounded-xl transition-shadow overflow-hidden ${
            focused ? 'border-neutral-400 shadow-md' : 'border-neutral-200 shadow-sm'
          }`}>
            <span className="pl-4 text-neutral-400 text-[1.05rem]">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="请输入问题..."
              className="flex-1 px-3 py-4 text-[0.95rem] text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-400 font-normal"
            />
            {query && (
              <button type="submit" className="mr-2 px-4 py-2 bg-neutral-900 text-white text-[0.78rem] font-medium rounded-lg hover:bg-neutral-800 transition-colors shrink-0">
                搜索
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 overflow-hidden">
              {searching ? (
                <div className="px-4 py-6 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="py-1">
                  {results.map(r => (
                    <Link
                      key={r.id}
                      href={`/internal/docs/${r.audienceSlug || 'general'}/${encodeURIComponent(r.slug)}`}
                      onClick={() => setFocused(false)}
                      className="block px-4 py-2.5 hover:bg-neutral-50 transition-colors no-underline"
                    >
                      <span className="text-[0.82rem] text-neutral-800 font-normal line-clamp-1">{r.title}</span>
                      <span className="text-[0.68rem] text-neutral-400">{r.department} · {catLabels[r.category] || r.category}</span>
                    </Link>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <p className="px-4 py-5 text-[0.82rem] text-neutral-400 text-center">未找到相关文档</p>
              ) : null}
            </div>
          )}
        </form>

        {/* Suggested questions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {suggestedQuestions.slice(0, 4).map((q, i) => (
            <button
              key={i}
              onClick={() => { setQuery(q); inputRef.current?.focus() }}
              className="px-3 py-1.5 text-[0.72rem] text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 hover:text-neutral-700 transition-colors font-normal"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Quick links */}
        {popularDocs.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mt-5">
            <span className="text-[0.7rem] text-neutral-400 font-medium">推荐文档：</span>
            {popularDocs.slice(0, 3).map(d => (
              <Link
                key={d.id}
                href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`}
                className="text-[0.78rem] text-neutral-600 hover:text-neutral-900 transition-colors no-underline font-normal"
              >
                {d.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
