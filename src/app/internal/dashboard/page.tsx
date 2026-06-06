'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ──
interface DashboardData {
  docCount: number; deptCount: number; companyCount: number
  aiDocCount: number; knowledgeCoverage: number
  recentDocs: DocRef[]; popularDocs: DocRef[]; newEmployeeDocs: DocRef[]
}
interface DocRef { id: string; title: string; slug: string; audienceSlug: string; department: string; category: string; updatedAt?: string }
interface SearchResult { id: string; title: string; snippet: string; department: string; category: string; slug: string; audienceSlug: string }
interface AISearchResponse { intent: string; summary: string; documents: SearchResult[]; primaryDoc?: SearchResult | null }

const quickPrompts = ['订货会流程', '如何申请报销', '商品审核流程', '客户对账怎么做', '员工手册']

// ── Local Storage Helpers ──
function getLocalList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function pushLocalList(key: string, id: string, max = 20) {
  const list = getLocalList(key).filter(x => x !== id)
  list.unshift(id)
  localStorage.setItem(key, JSON.stringify(list.slice(0, max)))
}

// ── Component ──
export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [aiResult, setAiResult] = useState<AISearchResponse | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/showroom/api/dashboard').then(r => r.json()),
      fetch('/showroom/api/auth/me').then(r => r.json()),
    ]).then(([d]) => {
      if (d && typeof d.docCount === 'number') setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // AI Search
  const doSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return
    setSearching(true)
    setShowDropdown(true)
    try {
      const res = await fetch('/showroom/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const result = await res.json()
      if (res.ok) setAiResult(result)
    } catch { /* silent */ }
    setSearching(false)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  // Click outside to close dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2">
          {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-8 md:py-14" ref={containerRef}>
      {/* ── Hero: AI Input ── */}
      <section className="text-center mb-12">
        <h1 className="text-[1.8rem] md:text-[2.1rem] font-semibold tracking-[-0.03em] text-neutral-900 mb-3">
          ✨ 今天需要了解什么？
        </h1>
        <p className="text-[0.9rem] text-neutral-500 mb-8">
          搜索文档、提问、查找流程 — 一个入口处理所有知识需求
        </p>

        {/* Search Box */}
        <div className="relative max-w-[640px] mx-auto">
          <div className={`flex items-center bg-white border rounded-2xl transition-all ${
            showDropdown ? 'border-neutral-400 shadow-lg' : 'border-neutral-200 shadow-sm hover:border-neutral-300'
          }`}>
            <span className="pl-5 text-neutral-400 text-[1.1rem]">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (aiResult) setShowDropdown(true) }}
              placeholder="输入问题、搜索文档、查找流程..."
              className="flex-1 px-3 py-4 text-[0.95rem] text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-400"
            />
            <button
              onClick={doSearch}
              disabled={searching}
              className="mr-2 px-5 py-2 bg-neutral-900 text-white text-[0.8rem] font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {searching ? '...' : '→'}
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {quickPrompts.map(p => (
              <button key={p} onClick={() => { setQuery(p); setTimeout(() => doSearch(), 50) }}
                className="px-3 py-1.5 text-[0.72rem] text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">
                {p}
              </button>
            ))}
          </div>

          {/* Dropdown Results */}
          {showDropdown && aiResult && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-30 overflow-hidden text-left">
              {/* Summary */}
              <div className="px-5 py-3 border-b border-neutral-100">
                <span className="text-[0.7rem] font-medium text-neutral-400 uppercase tracking-wider">
                  {aiResult.intent === 'question' ? '💡 问答' : aiResult.intent === 'sop' ? '📋 流程' : aiResult.intent === 'howto' ? '🔧 操作指引' : '📄 文档搜索'}
                </span>
                <p className="text-[0.85rem] text-neutral-700 mt-1">{aiResult.summary}</p>
              </div>

              {/* Document Results */}
              {aiResult.documents.length > 0 && (
                <div className="py-1">
                  {aiResult.documents.map(d => (
                    <Link
                      key={d.id}
                      href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors no-underline"
                    >
                      <div className="min-w-0">
                        <p className="text-[0.85rem] text-neutral-800 truncate">{d.title}</p>
                        <p className="text-[0.72rem] text-neutral-400 mt-0.5">{d.snippet || d.department}</p>
                      </div>
                      <span className="text-[0.65rem] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded ml-3 shrink-0">{d.category}</span>
                    </Link>
                  ))}
                </div>
              )}

              {aiResult.documents.length === 0 && (
                <p className="px-5 py-6 text-[0.82rem] text-neutral-400 text-center">未找到相关文档</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Two-Column: Workspace + Insights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Workspace */}
        <div className="md:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
            <h3 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">📋 最近更新</h3>
            {data?.recentDocs?.length ? (
              <div className="space-y-0.5">
                {data.recentDocs.slice(0, 5).map(d => (
                  <Link
                    key={d.id}
                    href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors no-underline group"
                  >
                    <span className="text-[0.85rem] text-neutral-700 group-hover:text-neutral-900 truncate">{d.title}</span>
                    <span className="text-[0.7rem] text-neutral-400 shrink-0 ml-3">
                      {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[0.82rem] text-neutral-400 py-4">暂无文档</p>
            )}
          </div>

          {/* Recommended / New Employee Must-Read */}
          {data?.newEmployeeDocs?.length ? (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
              <h3 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">📖 新员工必读</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.newEmployeeDocs.slice(0, 4).map(d => (
                  <Link
                    key={d.id}
                    href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`}
                    className="block px-4 py-3 border border-neutral-100 rounded-xl hover:border-neutral-300 hover:bg-neutral-50 transition-all no-underline"
                  >
                    <p className="text-[0.82rem] text-neutral-800 font-medium truncate">{d.title}</p>
                    <p className="text-[0.7rem] text-neutral-400 mt-0.5">{d.department}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* AI Insights Sidebar */}
        <div className="space-y-4">
          {/* AI Stats */}
          <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-5">
            <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">🤖 AI 能力</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[0.8rem] text-neutral-600">AI 解析文档</span>
                <span className="text-[0.8rem] font-semibold text-neutral-900">{data?.aiDocCount || 0} 篇</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.8rem] text-neutral-600">知识覆盖率</span>
                <span className="text-[0.8rem] font-semibold text-emerald-600">{data?.knowledgeCoverage || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.8rem] text-neutral-600">文档总数</span>
                <span className="text-[0.8rem] font-semibold text-neutral-900">{data?.docCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.8rem] text-neutral-600">部门数</span>
                <span className="text-[0.8rem] font-semibold text-neutral-900">{data?.deptCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Popular Docs */}
          {data?.popularDocs?.length ? (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
              <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">🔥 热门文档</h3>
              <div className="space-y-0.5">
                {data.popularDocs.slice(0, 4).map(d => (
                  <Link
                    key={d.id}
                    href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`}
                    className="block px-2 py-1.5 -mx-2 rounded-md hover:bg-neutral-50 transition-colors no-underline"
                  >
                    <p className="text-[0.8rem] text-neutral-700 truncate">{d.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Quick Links */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
            <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">⚡ 快捷入口</h3>
            <div className="space-y-1">
              {[
                { label: '浏览全部文档', href: '/internal/documents' },
                { label: '上传新文档', href: '/internal/documents' },
                { label: '全文搜索', href: '/internal/search' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-2 py-1.5 -mx-2 rounded-md text-[0.8rem] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors no-underline"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
