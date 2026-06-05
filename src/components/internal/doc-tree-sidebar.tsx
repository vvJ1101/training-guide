'use client'

import { useState } from 'react'

interface DocItem { id: string; title: string; slug: string; audience: string }

export function DocTreeSidebar({ docs, currentSlug }: {
  docs: DocItem[]
  currentSlug: string
}) {
  return (
    <aside className="fixed left-64 top-16 bottom-0 w-[280px] bg-white border-r border-neutral-200 overflow-y-auto">
      <div className="p-4">
        <p className="text-[0.6rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-4 px-2">
          文档目录
        </p>
        <nav className="space-y-0.5">
          {docs.map(doc => (
            <a
              key={doc.id}
              href={`/internal/docs/${doc.audience}/${encodeURIComponent(doc.slug)}`}
              className={`block px-2 py-1.5 text-[0.74rem] rounded-md transition-colors no-underline font-normal ${
                doc.slug === currentSlug
                  ? 'text-neutral-900 bg-neutral-100 font-medium'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <span className="block truncate">{doc.title}</span>
              <span className="text-[0.6rem] text-neutral-400 mt-0.5 block">
                适用：{doc.audience}
              </span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
