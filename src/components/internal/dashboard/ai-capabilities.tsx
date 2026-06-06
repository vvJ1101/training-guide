interface Props {
  aiDocCount: number
  mermaidCount: number
  faqCount: number
  chatCount: number
  knowledgeCoverage: number
}

const items = [
  { key: 'aiDocCount', label: 'AI 解析文档', icon: '🤖' },
  { key: 'mermaidCount', label: '流程图', icon: '📊' },
  { key: 'faqCount', label: '生成 FAQ', icon: '📋' },
  { key: 'chatCount', label: 'AI 问答', icon: '💡' },
  { key: 'knowledgeCoverage', label: '知识覆盖率', icon: '🎯' },
]

export function AICapabilities({ aiDocCount, mermaidCount, faqCount, chatCount, knowledgeCoverage }: Props) {
  const values: Record<string, number | string> = {
    aiDocCount: `${aiDocCount} 篇`,
    mermaidCount: `${mermaidCount} 张`,
    faqCount: `${faqCount} 条`,
    chatCount: `${chatCount.toLocaleString()} 次`,
    knowledgeCoverage: `${knowledgeCoverage}%`,
  }

  return (
    <section className="mb-10">
      <h2 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">AI 能力</h2>
      <div className="bg-white border border-neutral-200/80 rounded-xl px-0 py-2">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x-0 md:divide-x divide-neutral-100">
          {items.map((item, i) => (
            <div key={item.key} className="px-5 py-3 text-center">
              <span className="text-[1.05rem]">{item.icon}</span>
              <p className="text-[1.25rem] font-semibold text-neutral-900 mt-0.5">{values[item.key]}</p>
              <p className="text-[0.68rem] text-neutral-400 font-normal">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
