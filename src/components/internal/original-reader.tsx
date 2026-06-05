'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Mermaid } from '@/components/internal/mermaid-renderer'

interface Doc {
  title: string; content: string; category: string
  department: { name: string }; author: { name: string }
  updatedAt: Date | string
}

const catLabels: Record<string, string> = { training: '培训资料', sop: 'SOP', reference: '企业制度', brand: '品牌资产' }

export function OriginalReader({ doc }: { doc: Doc }) {
  return (
    <div className="max-w-[960px] mx-auto py-8 md:py-12 px-4 md:px-8 lg:px-14">
      {/* Header */}
      <header className="mb-10 pb-8 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-[0.72rem] font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded">
            {catLabels[doc.category] || doc.category}
          </span>
          <span className="text-[0.78rem] text-neutral-400">归属部门：{doc.department.name}</span>
        </div>
        <h1 className="text-[1.7rem] font-semibold leading-[1.35] tracking-[-0.02em] text-neutral-900 mb-3">
          {doc.title}
        </h1>
        <p className="text-[0.82rem] text-neutral-400">
          {doc.author.name} · {new Date(doc.updatedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* Raw content — 100% as-is from DOCX */}
      <article className="doc-content max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          h1: ({ children }) => <h1 className="text-[1.35rem] font-semibold text-neutral-900 mt-10 mb-4 pb-2 border-b-2 border-neutral-200">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[1.15rem] font-semibold text-neutral-900 mt-8 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[1rem] font-semibold text-neutral-800 mt-6 mb-2 pl-3 border-l-[3px] border-neutral-300">{children}</h3>,
          h4: ({ children }) => <h4 className="text-[0.9rem] font-semibold text-neutral-700 mt-4 mb-2 px-3 py-1.5 bg-neutral-100 rounded">{children}</h4>,
          p: ({ children }) => <p className="text-[0.92rem] leading-[1.9] text-neutral-700 font-normal mb-4">{children}</p>,
          ul: ({ children }) => <ul className="mb-6 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-6 space-y-2 list-decimal list-inside marker:text-neutral-400">{children}</ol>,
          li: ({ children }) => <li className="text-[0.92rem] leading-[1.8] text-neutral-700 pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
          img: ({ src, alt }) => src ? (
            <figure className="my-10">
              <img src={src.startsWith('/') ? `/showroom${src}` : src} alt={alt || '截图'}
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
            return <code className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded text-[0.85rem] font-mono" {...props}>{children}</code>
          },
        }}>
          {doc.content || '_暂无内容_'}
        </ReactMarkdown>
      </article>
    </div>
  )
}
