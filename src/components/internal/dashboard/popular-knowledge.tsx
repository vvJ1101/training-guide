import Link from 'next/link'

interface DocRef {
  id: string; title: string; audienceSlug: string; slug: string
  department: string; category: string
}

interface Props {
  popularDocs: DocRef[]
  newEmployeeDocs: DocRef[]
  recentDocs: DocRef[]
  referenceDocs: DocRef[]
}

function DocList({ docs, emptyText = '暂无文档' }: { docs: DocRef[]; emptyText?: string }) {
  if (!docs.length) {
    return <p className="text-[0.78rem] text-neutral-400 py-4 px-1">{emptyText}</p>
  }
  return (
    <div className="space-y-0.5">
      {docs.slice(0, 4).map(doc => (
        <Link
          key={doc.id}
          href={`/internal/docs/${doc.audienceSlug || 'general'}/${encodeURIComponent(doc.slug)}`}
          className="block px-2 py-1.5 -mx-2 rounded-md hover:bg-neutral-100 transition-colors no-underline"
        >
          <span className="text-[0.82rem] text-neutral-700 font-normal line-clamp-1">{doc.title}</span>
        </Link>
      ))}
    </div>
  )
}

export function PopularKnowledge({ popularDocs, newEmployeeDocs, recentDocs, referenceDocs }: Props) {
  return (
    <section className="mb-10">
      <h2 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">热门知识</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 热门文档 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-5">
          <p className="text-[0.78rem] font-medium text-neutral-800 mb-3">🔥 热门文档</p>
          <DocList docs={popularDocs} emptyText="暂无热门文档" />
        </div>

        {/* 新员工必读 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-5">
          <p className="text-[0.78rem] font-medium text-neutral-800 mb-3">📖 新员工必读</p>
          <DocList docs={newEmployeeDocs} emptyText="暂无相关文档" />
        </div>

        {/* 最新制度 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-5">
          <p className="text-[0.78rem] font-medium text-neutral-800 mb-3">📋 最新制度</p>
          <DocList docs={referenceDocs} emptyText="暂无制度文档" />
        </div>

        {/* 最近更新 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-5">
          <p className="text-[0.78rem] font-medium text-neutral-800 mb-3">🆕 最近更新</p>
          <DocList docs={recentDocs} emptyText="暂无更新" />
        </div>
      </div>
    </section>
  )
}
