interface Props {
  docCount: number
  companyCount: number
  deptCount: number
  faqCount: number
}

const items = [
  { key: 'docCount', label: '文档总数', icon: '📄' },
  { key: 'companyCount', label: '公司', icon: '🏢' },
  { key: 'deptCount', label: '部门', icon: '👥' },
  { key: 'faqCount', label: 'FAQ', icon: '💬' },
]

export function StatsCards({ docCount, companyCount, deptCount, faqCount }: Props) {
  const values: Record<string, number> = { docCount, companyCount, deptCount, faqCount }

  return (
    <section className="mb-10">
      <h2 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">知识库概览</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.key} className="bg-white border border-neutral-200/80 rounded-xl px-4 py-3.5 hover:border-neutral-300 transition-colors">
            <span className="text-[1.15rem]">{item.icon}</span>
            <p className="text-[1.35rem] font-semibold text-neutral-900 mt-1">{values[item.key]}</p>
            <p className="text-[0.7rem] text-neutral-400 font-normal">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
