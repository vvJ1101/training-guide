'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DocRef { id: string; title: string; slug: string; category?: string; department?: string; reason?: string; riskLevel?: string; updatedAt?: string; audiences?: { department?: { slug?: string } }[]; audienceSlug?: string; ownerDept?: { name: string; slug?: string } }
interface RecData { popular: DocRef[]; forYou: DocRef[]; riskAlerts: DocRef[] }
interface WsData { user: { role: string; departmentName: string; companyName: string }; stats: { totalDocs: number; aiParsed: number; recentlyViewed: number; toLearn: number }; recentViews: DocRef[]; recentUpdates: DocRef[]; toLearnDocs: DocRef[]; aiParsedDocs: DocRef[]; accessibleRange: string; editableRange: string }
interface TaskData { tasks: { type: string; priority: string; title: string; reason: string; doc: { id: string; title: string; slug: string; audienceSlug: string }; action: string }[]; summary: { total: number; high: number; medium: number; low: number; unreadCount: number } }
interface SR { id: string; title: string; snippet: string; department: string; category: string; slug: string; audienceSlug: string }
interface ASR { intent: string; summary: string; documents: SR[] }

const quickPrompts = ['如何审核订单？', '联欣系统怎么操作？', '期货尾款流程是什么？', '最近更新的政策是什么？', '商品审核流程']

function slug(d: DocRef) { return (d as any).audiences?.[0]?.department?.slug || (d as any).audienceSlug || d.ownerDept?.slug || 'general' }

export default function DashboardPage() {
  const router = useRouter()
  const [wsData, setWsData] = useState<WsData | null>(null)
  const [recData, setRecData] = useState<RecData | null>(null)
  const [taskData, setTaskData] = useState<TaskData | null>(null)
  const [bookmarks, setBookmarks] = useState<DocRef[]>([])
  const [activeTab, setActiveTab] = useState('recent')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [aiResult, setAiResult] = useState<ASR | null>(null)
  const [showDD, setShowDD] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/showroom/api/workspace/activity').then(r => r.json()).catch(() => null),
      fetch('/showroom/api/recommendations/home').then(r => r.json()).catch(() => null),
      fetch('/showroom/api/workspace/tasks').then(r => r.json()).catch(() => null),
      fetch('/showroom/api/bookmarks').then(r => r.json()).catch(() => null),
    ]).then(([w, r, t, b]) => {
      if (w?.user) setWsData(w)
      if (r) setRecData(r)
      if (t?.tasks) setTaskData(t)
      if (b?.bookmarks) setBookmarks(b.bookmarks)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const doSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return
    setSearching(true); setShowDD(true)
    try {
      const res = await fetch('/showroom/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim() }) })
      const r = await res.json()
      if (res.ok) setAiResult(r)
    } catch { /* */ }
    setSearching(false)
  }

  useEffect(() => { function h(e: MouseEvent) { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDD(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="flex gap-2">{[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}</div></div>

  const u = wsData?.user

  const tabs = [
    { key: 'recent', label: '最近访问', value: wsData?.stats.recentlyViewed || 0, icon: '👁' },
    { key: 'bookmarks', label: '收藏文档', value: bookmarks.length, icon: '⭐' },
    { key: 'toLearn', label: '待学习', value: wsData?.stats.toLearn || 0, icon: '📖' },
    { key: 'all', label: '全部文档', value: wsData?.stats.totalDocs || 0, icon: '📄' },
    { key: 'ai', label: 'AI 解析', value: wsData?.stats.aiParsed || 0, icon: '🤖' },
  ]

  const tabContent = () => {
    let list: DocRef[] = []
    let emptyText = '暂无数据'
    let listHref = '/internal/documents'
    switch (activeTab) {
      case 'recent':
        list = wsData?.recentViews || []
        emptyText = '暂无访问记录'
        break
      case 'bookmarks':
        list = bookmarks
        emptyText = '还没有收藏文档'
        listHref = '/internal/bookmarks'
        break
      case 'toLearn':
        list = wsData?.toLearnDocs || []
        emptyText = '暂无待学习文档'
        break
      case 'ai':
        list = wsData?.aiParsedDocs || []
        emptyText = '暂无 AI 解析文档'
        listHref = '/internal/sop'
        break
      case 'all':
        // Link only — no inline list
        break
    }
    return { list, emptyText, listHref }
  }

  return (
    <div className="max-w-[1024px] mx-auto px-4 md:px-8 py-6 md:py-10" ref={containerRef}>
      {/* ═══════ ZONE 1: Global AI Hub ═══════ */}
      <section className="text-center mb-8">
        <h1 className="text-[1.6rem] md:text-[1.9rem] font-semibold tracking-[-0.03em] text-neutral-900 mb-1">✨ AI 知识助手</h1>
        <p className="text-[0.85rem] text-neutral-500 mb-6">搜索文档 · 智能问答 · 流程指引 — 一个入口</p>
        <div className="relative max-w-[680px] mx-auto">
          <div className={`flex items-center bg-white border rounded-2xl transition-all ${showDD ? 'border-neutral-400 shadow-lg' : 'border-neutral-200 shadow-sm hover:border-neutral-300'}`}>
            <span className="pl-5 text-neutral-400 text-[1.1rem]">🔍</span>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSearch() }} onFocus={() => { if (aiResult) setShowDD(true) }} placeholder="输入问题、搜索文档、查找流程..." className="flex-1 px-3 py-4 text-[0.95rem] text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-400" />
            <button onClick={doSearch} disabled={searching} className="mr-2 px-5 py-2 bg-neutral-900 text-white text-[0.78rem] font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors">{searching ? '...' : '→'}</button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {quickPrompts.map(p => <button key={p} onClick={() => { setQuery(p); setTimeout(doSearch, 50) }} className="px-3 py-1.5 text-[0.7rem] text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">{p}</button>)}
          </div>
          {showDD && aiResult && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-30 overflow-hidden text-left">
              <div className="px-5 py-3 border-b border-neutral-100"><span className="text-[0.68rem] font-medium text-neutral-400 uppercase tracking-wider">{aiResult.intent === 'question' ? '💡 问答' : aiResult.intent === 'sop' ? '📋 流程' : aiResult.intent === 'howto' ? '🔧 操作' : '📄 搜索'}</span><p className="text-[0.85rem] text-neutral-700 mt-0.5">{aiResult.summary}</p></div>
              {aiResult.documents.length > 0 ? <div className="py-1">{aiResult.documents.map(d => <Link key={d.id} href={`/internal/docs/${d.audienceSlug || 'general'}/${encodeURIComponent(d.slug)}`} onClick={() => setShowDD(false)} className="flex justify-between px-5 py-3 hover:bg-neutral-50 transition-colors no-underline"><div className="min-w-0"><p className="text-[0.85rem] text-neutral-800 truncate">{d.title}</p><p className="text-[0.72rem] text-neutral-400 mt-0.5">{d.snippet || d.department}</p></div><span className="text-[0.65rem] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded ml-3 shrink-0">{d.category}</span></Link>)}</div> : <p className="px-5 py-6 text-[0.82rem] text-neutral-400 text-center">未找到相关文档</p>}
            </div>
          )}
        </div>
      </section>

      {/* ═══════ ZONE 2: Task Engine ═══════ */}
      {taskData && taskData.tasks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">🧠 待办事项 · <span className="text-amber-600">{taskData.summary.high} 项高优先级</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {taskData.tasks.slice(0, 8).map((t, i) => (
              <Link key={i} href={`/internal/docs/${t.doc.audienceSlug || 'general'}/${encodeURIComponent(t.doc.slug)}`}
                className={`block px-4 py-3.5 rounded-xl border transition-all no-underline hover:shadow-sm ${t.priority === 'high' ? 'bg-red-50/50 border-red-200 hover:bg-red-50' : t.priority === 'medium' ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50' : 'bg-white border-neutral-200 hover:border-neutral-400'}`}>
                <p className="text-[0.78rem] text-neutral-800 font-medium line-clamp-1">{t.title}</p>
                <p className="text-[0.68rem] text-neutral-500 mt-1">{t.reason}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ ZONE 3: My Workspace ═══════ */}
      <section className="mb-8">
        <h2 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">📌 我的工作区</h2>
        {/* Tab bar */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-xl px-3 py-3 text-center transition-all border ${
                activeTab === t.key
                  ? 'bg-white border-neutral-400 shadow-sm ring-1 ring-neutral-200'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <span className="text-[1.1rem]">{t.icon}</span>
              <p className="text-[1.1rem] font-semibold text-neutral-900 mt-0.5">{t.value}</p>
              <p className={`text-[0.6rem] ${activeTab === t.key ? 'text-neutral-500 font-medium' : 'text-neutral-400'}`}>{t.label}</p>
            </button>
          ))}
        </div>
        {/* Content area */}
        {activeTab === 'all' ? (
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 text-center">
            <p className="text-[0.9rem] text-neutral-600 mb-3">共 {wsData?.stats.totalDocs || 0} 篇文档</p>
            <Link href="/internal/documents" className="inline-block px-5 py-2.5 bg-neutral-900 text-white text-[0.82rem] font-medium rounded-xl hover:bg-neutral-800 no-underline">浏览全部文档 →</Link>
          </div>
        ) : (() => {
          const { list, emptyText, listHref } = tabContent()
          return list.length > 0 ? (
            <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden">
              {list.slice(0, 6).map((d, i) => (
                <Link
                  key={d.id || i}
                  href={`/internal/docs/${slug(d)}/${encodeURIComponent(d.slug)}`}
                  className={`flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors no-underline ${i > 0 ? 'border-t border-neutral-100' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-[0.85rem] text-neutral-800 truncate">
                      {d.title}
                      {(d as any).priority === 'high' && <span className="ml-2 text-[0.6rem] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">必修</span>}
                      {(d as any).priority === 'medium' && <span className="ml-2 text-[0.6rem] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">岗位</span>}
                    </p>
                    <p className="text-[0.7rem] text-neutral-400 mt-0.5">{(d as any).reason || d.department || (d as any).ownerDept?.name || ''}</p>
                  </div>
                  <span className="text-[0.65rem] text-neutral-400 shrink-0 ml-3">{d.category || ''}</span>
                </Link>
              ))}
              {list.length > 6 && (
                <div className="px-5 py-3 border-t border-neutral-100 text-center">
                  <Link href={listHref} className="text-[0.75rem] text-neutral-500 hover:text-neutral-900 no-underline">查看全部 {list.length} 项 →</Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center">
              <p className="text-[0.85rem] text-neutral-400">{emptyText}</p>
            </div>
          )
        })()}
      </section>

      {/* ═══════ ZONE 4: Knowledge Hub ═══════ */}
      <section className="mb-8">
        <h2 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">📚 知识中心</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
            <p className="text-[0.75rem] font-medium text-neutral-600 mb-3">按类型浏览</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'SOP 流程', href: '/internal/sop', icon: '📋' },
                { label: '订货政策', href: '/internal/policy', icon: '📜' },
                { label: 'FAQ', href: '/internal/faq', icon: '💬' },
                { label: '培训资料', href: '/internal/documents?category=training', icon: '📖' },
              ].map(item => (
                <Link key={item.href} href={item.href} className="px-4 py-3 border border-neutral-100 rounded-xl text-[0.82rem] text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition-all no-underline text-center">{item.icon} {item.label}</Link>
              ))}
            </div>
          </div>
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
            <p className="text-[0.75rem] font-medium text-neutral-600 mb-3">快捷入口</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '📚 全部文档', href: '/internal/documents' },
                { label: '🔍 全文搜索', href: '/internal/search' },
                { label: '⭐ 我的收藏', href: '/internal/bookmarks' },
                { label: '📤 上传文档', href: '/internal/documents' },
              ].map(item => (
                <Link key={item.href} href={item.href} className="px-4 py-3 border border-neutral-100 rounded-xl text-[0.82rem] text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition-all no-underline text-center">{item.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ ZONE 5+6: Org & Access + AI Recommendations ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
            <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">🔐 我的权限</h3>
            <div className="space-y-2.5 text-[0.82rem]">
              <div className="flex justify-between"><span className="text-neutral-500">公司</span><span className="font-medium text-neutral-800">{u?.companyName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">部门</span><span className="font-medium text-neutral-800">{u?.departmentName || '未分配'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">角色</span><span className={`font-medium ${u?.role === 'super_admin' ? 'text-purple-700' : u?.role === 'dept_admin' ? 'text-blue-700' : 'text-neutral-700'}`}>{u?.role === 'super_admin' ? '超级管理员' : u?.role === 'dept_admin' ? '部门管理员' : '员工'}</span></div>
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-[0.7rem] text-neutral-400">可查看范围</p><p className="text-[0.78rem] text-neutral-700 mt-0.5">{wsData?.accessibleRange || '—'}</p>
              </div>
              <div>
                <p className="text-[0.7rem] text-neutral-400">可编辑范围</p><p className="text-[0.78rem] text-neutral-700 mt-0.5">{wsData?.editableRange || '—'}</p>
              </div>
            </div>
          </div>
          {u?.role === 'super_admin' && (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
              <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-3">⚙️ 系统管理</h3>
              <div className="space-y-1">
                <Link href="/internal/admin/users" className="block px-2 py-1.5 -mx-2 rounded-md text-[0.8rem] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 no-underline">👥 用户管理</Link>
                <Link href="/internal/policy-upload" className="block px-2 py-1.5 -mx-2 rounded-md text-[0.8rem] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 no-underline">📜 更新订货政策</Link>
              </div>
            </div>
          )}
          {u?.role === 'dept_admin' && u?.companyName === '时胜' && u?.departmentName === '品牌部' && (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
              <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-3">⚙️ 品牌管理</h3>
              <Link href="/internal/policy-upload" className="block px-2 py-1.5 -mx-2 rounded-md text-[0.8rem] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 no-underline">📜 更新订货政策</Link>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          {recData?.riskAlerts?.length ? (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
              <h3 className="text-[0.72rem] font-medium text-amber-700 uppercase tracking-wider mb-3">⚠️ 风险提醒</h3>
              <div className="flex flex-wrap gap-2">
                {recData.riskAlerts.slice(0, 3).map(d => (
                  <Link key={d.id} href={`/internal/docs/${slug(d)}/${encodeURIComponent(d.slug)}`} className="flex-1 min-w-[180px] px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors no-underline">
                    <p className="text-[0.78rem] text-amber-800 font-medium truncate">{d.title}</p><p className="text-[0.68rem] text-amber-600 mt-1">{d.reason}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
            <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">🔥 热门文档</h3>
            <div className="space-y-0.5">
              {recData?.popular?.length ? recData.popular.slice(0, 5).map(d => (
                <Link key={d.id} href={`/internal/docs/${slug(d)}/${encodeURIComponent(d.slug)}`} className="flex justify-between px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors no-underline group">
                  <div className="min-w-0"><p className="text-[0.85rem] text-neutral-800 group-hover:text-neutral-900 truncate">{d.title}</p><p className="text-[0.7rem] text-neutral-400 mt-0.5">{d.reason}</p></div>
                  <span className="text-[0.65rem] text-neutral-400 shrink-0 ml-3">{d.ownerDept?.name || d.category}</span>
                </Link>
              )) : <p className="text-[0.82rem] text-neutral-400 py-4">暂无推荐</p>}
            </div>
          </div>
          {recData?.forYou?.length ? (
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5">
              <h3 className="text-[0.72rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">📌 推荐给你</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recData.forYou.slice(0, 4).map(d => (
                  <Link key={d.id} href={`/internal/docs/${slug(d)}/${encodeURIComponent(d.slug)}`} className="px-4 py-3 border border-neutral-100 rounded-xl hover:border-neutral-300 hover:bg-neutral-50 transition-all no-underline">
                    <p className="text-[0.82rem] text-neutral-800 font-medium truncate">{d.title}</p><p className="text-[0.7rem] text-neutral-400 mt-1">{d.reason}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
