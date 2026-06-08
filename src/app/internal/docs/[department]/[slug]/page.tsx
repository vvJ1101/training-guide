'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarkdownReader } from '@/components/internal/markdown-reader'
import { Mermaid } from '@/components/internal/mermaid-renderer'

interface Doc {
  id: string; title: string; slug: string; content: string; fullContent: string; condensedContent: string
  displayMode: string; category: string; ownerDeptId: string
  ownerDept: { name: string; slug: string }
  audiences: { id: string; departmentId: string; department: { name: string; slug: string } }[]
  author: { name: string }; updatedAt: string
}

type ViewMode = 'original' | 'condensed'
const catLabels: Record<string, string> = { training: '培训资料', sop: 'SOP', reference: '企业制度', brand: '品牌资产' }

export default function DocPage() {
  const params = useParams()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('original')
  const [bookmarked, setBookmarked] = useState(false)
  const [graph, setGraph] = useState<any>(null)

  useEffect(() => {
    if (!doc?.id) return
    fetch('/showroom/api/bookmarks')
      .then(r => r.json())
      .then(d => { if (d?.ids?.includes(doc.id)) setBookmarked(true) })
      .catch(() => {})
    fetch(`/showroom/api/documents/${doc.id}/graph`)
      .then(r => r.json())
      .then(d => { if (d?.edges) setGraph(d) })
      .catch(() => {})
  }, [doc?.id])

  const toggleBookmark = async () => {
    if (!doc?.id) return
    if (bookmarked) {
      await fetch(`/showroom/api/bookmarks?documentId=${encodeURIComponent(doc.id)}`, { method: 'DELETE' })
      setBookmarked(false)
    } else {
      await fetch('/showroom/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      setBookmarked(true)
    }
  }

  useEffect(() => {
    const slug = decodeURIComponent(params.slug as string)
    fetch('/showroom/api/documents')
      .then(r => r.json())
      .then((docs: Doc[]) => {
        let found = docs.find((d: Doc) => d.slug === slug && d.audiences?.some((a: any) => a.department.slug === (params.department as string)))
        if (!found) found = docs.find((d: Doc) => d.slug === slug && d.ownerDept?.slug === (params.department as string))
        if (!found) found = docs.find((d: Doc) => d.slug === slug)
        if (found) return fetch(`/showroom/api/documents/${found.id}`).then(r => r.json())
        return null
      })
      .then(docData => {
        if (docData?.id) { setDoc(docData); if (docData.condensedContent) setViewMode('condensed') }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.slug, params.department])

  if (loading) {
    return (
      <div className="p-10 text-center text-[0.85rem] text-neutral-400">
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-6 bg-neutral-200 rounded w-1/3" />
          <div className="h-4 bg-neutral-100 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="p-10 text-center">
        <p className="text-neutral-500 mb-4">Document not found.</p>
        <Link href="/internal/documents" className="text-[0.82rem] text-neutral-500 hover:text-neutral-900">返回列表</Link>
      </div>
    )
  }

  const hasCondensed = !!(doc.condensedContent && doc.condensedContent.trim())
  const isOriginal = viewMode === 'original'

  return (
    <main>
      {/* ═══ Unified Header ═══ */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 pt-8">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/internal/documents" className="text-[0.78rem] text-neutral-400 hover:text-neutral-700 no-underline">
            &larr; 返回列表
          </Link>

          {/* Mode toggle — iOS-style segmented control */}
          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('original')}
              className={`px-4 py-1.5 text-[0.75rem] rounded-md transition-all font-medium ${
                isOriginal ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              原文
            </button>
            <button
              onClick={() => hasCondensed && setViewMode('condensed')}
              disabled={!hasCondensed}
              className={`px-4 py-1.5 text-[0.75rem] rounded-md transition-all font-medium ${
                !isOriginal ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
              } ${!hasCondensed ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              精简版
            </button>
          </div>

        </div>

        {/* Document meta — shared by both modes */}
        <div className="mb-8 pb-8 border-b border-neutral-200">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-[0.72rem] font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded">
              {catLabels[doc.category] || doc.category}
            </span>
            <button
              onClick={toggleBookmark}
              className={`text-[0.78rem] px-2.5 py-1 rounded border transition-colors ${
                bookmarked ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600'
              }`}
            >
              {bookmarked ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
            <span className="text-[0.78rem] text-neutral-400">归属：{doc.ownerDept.name}</span>
            {doc.audiences?.length > 0 && (
              <span className="text-[0.78rem] text-neutral-400">适用：{doc.audiences.map(a => a.department.name).join('、')}</span>
            )}
            {isOriginal && (
              <span className="text-[0.68rem] text-neutral-300 border border-neutral-200 px-2 py-0.5 rounded cursor-default select-none" title="原文为 DOCX 原始解析内容，不支持编辑。切换到「精简版」可编辑">
                只读
              </span>
            )}
          </div>
          <h1 className="text-[1.7rem] font-semibold leading-[1.35] tracking-[-0.02em] text-neutral-900 mb-2">
            {doc.title}
          </h1>
          <p className="text-[0.82rem] text-neutral-400">
            {doc.author.name} · {new Date(doc.updatedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Original mode hint */}
          {isOriginal && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md">
              <span className="text-[0.7rem] text-neutral-400">
                原文为 DOCX 原始解析内容，不支持编辑。如需修改，请切换到
              </span>
              <button onClick={() => hasCondensed && setViewMode('condensed')} disabled={!hasCondensed}
                className="text-[0.7rem] text-neutral-900 font-medium underline hover:text-neutral-600 disabled:opacity-40">
                精简版
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {isOriginal ? (
        /* ── Original: read-only ── */
        <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 pb-16">
          <article className="doc-content max-w-none opacity-90">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              h1: ({ children }) => <h1 className="text-[1.35rem] font-semibold text-neutral-800 mt-10 mb-4 pb-2 border-b-2 border-neutral-200">{children}</h1>,
              h2: ({ children }) => <h2 className="text-[1.15rem] font-semibold text-neutral-800 mt-8 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[1rem] font-semibold text-neutral-700 mt-6 mb-2 pl-3 border-l-[3px] border-neutral-300">{children}</h3>,
              h4: ({ children }) => <h4 className="text-[0.9rem] font-semibold text-neutral-700 mt-4 mb-2 px-3 py-1.5 bg-neutral-100 rounded">{children}</h4>,
              p: ({ children }) => <p className="text-[0.92rem] leading-[1.9] text-neutral-600 font-normal mb-4">{children}</p>,
              ul: ({ children }) => <ul className="mb-6 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="mb-6 space-y-2 list-decimal list-inside marker:text-neutral-400">{children}</ol>,
              li: ({ children }) => <li className="text-[0.92rem] leading-[1.8] text-neutral-600 pl-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-neutral-800">{children}</strong>,
              img: ({ src, alt }) => src ? (
                <figure className="my-10">
                  <img src={src.startsWith('/showroom/') ? src : src.startsWith('/') ? `/showroom${src}` : src} alt={alt || '截图'}
                    className="w-full max-w-full h-auto rounded-lg border border-neutral-200 shadow-sm" loading="lazy" />
                  <figcaption className="text-[0.78rem] text-neutral-400 text-center mt-3">{alt || '操作截图'}</figcaption>
                </figure>
              ) : null,
              table: ({ children }) => <div className="overflow-x-auto my-6 rounded-lg border border-neutral-200"><table className="w-full text-[0.85rem]">{children}</table></div>,
              th: ({ children }) => <th className="border-b border-neutral-200 px-4 py-2.5 bg-neutral-50 text-left font-semibold text-neutral-700 text-[0.78rem]">{children}</th>,
              td: ({ children }) => <td className="border-b border-neutral-100 px-4 py-2.5 text-neutral-600">{children}</td>,
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '')
                if (match && match[1] === 'mermaid') return <Mermaid chart={String(children).replace(/\n$/, '')} />
                return <code className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded text-[0.85rem] font-mono" {...props}>{children}</code>
              },
            }}>
              {doc.fullContent || doc.content || '_暂无内容_'}
            </ReactMarkdown>
          </article>
        </div>
      ) : (
        /* ── Condensed: interactive editing ── */
        <MarkdownReader hideHeader doc={{
          id: doc.id, title: doc.title,
          content: doc.condensedContent || doc.fullContent || doc.content,
          condensedContent: doc.condensedContent,
          displayMode: doc.displayMode, category: doc.category,
          department: doc.ownerDept, author: doc.author,
          updatedAt: doc.updatedAt,
          audiences: doc.audiences.map(a => a.department.name),
          ownerDeptId: doc.ownerDeptId,
        }} />
      )}

      {/* ── Document Graph: Related Documents ── */}
      {graph?.edges && (
        <section className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 pb-16">
          <div className="border-t border-neutral-200 pt-8 mt-4">
            <h3 className="text-[0.8rem] font-medium text-neutral-500 uppercase tracking-wider mb-4">🧩 关联文档</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {graph.edges.prerequisites?.length > 0 && <GraphBlock title="📌 前置文档" docs={graph.edges.prerequisites} />}
              {graph.edges.sameStage?.length > 0 && <GraphBlock title="🔄 同阶段文档" docs={graph.edges.sameStage} />}
              {graph.edges.relatedDocs?.length > 0 && <GraphBlock title="🔗 关联文档" docs={graph.edges.relatedDocs} />}
            </div>
          </div>
        </section>
      )}

    </main>
  )
}

function GraphBlock({ title, docs }: { title: string; docs: any[] }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <p className="text-[0.72rem] font-medium text-neutral-500 mb-2">{title}</p>
      {docs.map((d: any) => (
        <Link key={d.id} href={`/internal/docs/${d.audiences?.[0]?.department?.slug || d.ownerDept?.slug || 'general'}/${encodeURIComponent(d.slug)}`}
          className="block px-2 py-1.5 -mx-2 rounded-md text-[0.82rem] text-neutral-700 hover:bg-neutral-50 no-underline">{d.title}</Link>
      ))}
    </div>
  )
}
