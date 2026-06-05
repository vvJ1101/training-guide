'use client'

import { useState, useMemo, useEffect } from 'react'

interface Policy {
  category: string; country: string; brand: string; style: string
  priceRange: string; series: string; ss26: string; aw26: string
  delivery: string; nonCutoff: string; pr: string
}

type SortKey = 'category' | 'country' | 'brand'

export default function PolicyPage() {
  const [items, setItems] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState('')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [expandAll, setExpandAll] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('category')

  useEffect(() => {
    fetch('/showroom/data/policies.json')
      .then(async r => {
        const d = await r.json()
        if (Array.isArray(d)) setItems(d)
      })
    // Fetch update time
    fetch('/showroom/data/policies.updated.json')
      .then(r => r.json())
      .then(d => { if (d.updatedAt) setUpdatedAt(new Date(d.updatedAt).toLocaleString('zh-CN')) })
      .catch(() => {})
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Compute counts for filter buttons
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {}
    items.forEach(p => { m[p.category] = (m[p.category] || 0) + 1 })
    return m
  }, [items])

  const countryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    items.forEach(p => { m[p.country] = (m[p.country] || 0) + 1 })
    return m
  }, [items])

  const categories = Object.keys(catCounts).sort()
  const countries = Object.keys(countryCounts).sort()

  // Sort + filter
  const filtered = useMemo(() => {
    let list = [...items]
    // Sort
    list.sort((a, b) => {
      const va = a[sortKey] || ''
      const vb = b[sortKey] || ''
      return va.localeCompare(vb, 'zh')
    })
    // Filter
    return list.map((p, idx) => ({ ...p, _idx: idx })).filter(p => {
      if (catFilter && p.category !== catFilter) return false
      if (countryFilter && p.country !== countryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.brand.toLowerCase().includes(q) && !p.style.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, sortKey, catFilter, countryFilter, search])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    filtered.forEach(p => {
      if (!groups[p.category]) groups[p.category] = []
      groups[p.category].push(p)
    })
    return groups
  }, [filtered])

  function toggle(i: number) {
    setExpanded(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n })
  }

  function toggleAll() {
    if (expandAll) { setExpanded(new Set()); setExpandAll(false) }
    else { setExpanded(new Set(filtered.map(p => p._idx))); setExpandAll(true) }
  }

  // Highlight search term
  function highlight(text: string) {
    if (!search || search.length < 1) return text
    const idx = text.toLowerCase().indexOf(search.toLowerCase())
    if (idx < 0) return text
    return <>{text.slice(0, idx)}<mark className="bg-amber-100 text-amber-900 px-0.5 rounded">{text.slice(idx, idx + search.length)}</mark>{text.slice(idx + search.length)}</>
  }

  if (loading) {
    return <div className="p-10 text-center text-[0.85rem] text-neutral-400">加载中...</div>
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.3rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">品牌订货政策</h1>
          <p className="text-[0.82rem] text-neutral-500 font-normal">
            {items.length} 个品牌{filtered.length !== items.length ? ` · 筛选 ${filtered.length} 个` : ''}
            {updatedAt && <span className="text-neutral-400"> · 更新于 {updatedAt}</span>}
          </p>
        </div>
        <button onClick={toggleAll} className="text-[0.72rem] text-neutral-500 hover:text-neutral-900 transition-colors font-normal">
          {expandAll ? '收起全部' : '展开全部'}
        </button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3 mb-6">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索品牌名或风格..."
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-[0.85rem] focus:outline-none focus:border-neutral-900 transition-colors font-normal"
        />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-[0.65rem] text-neutral-400 font-medium mr-1">排序：</span>
          {([['category','类目'],['country','国家'],['brand','品牌名']] as [SortKey,string][]).map(([k, v]) => (
            <button key={k} onClick={() => setSortKey(k)}
              className={`px-2.5 py-1 text-[0.7rem] rounded-md border transition-colors font-normal ${sortKey === k ? 'bg-neutral-100 border-neutral-400 text-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'}`}>{v}</button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[0.65rem] text-neutral-400 font-medium mr-1 self-center">类目：</span>
          <button onClick={() => setCatFilter('')} className={`px-2.5 py-1 text-[0.7rem] rounded-md border transition-colors font-normal ${!catFilter ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>全部</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
              className={`px-2.5 py-1 text-[0.7rem] rounded-md border transition-colors font-normal ${catFilter === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              {c} ({catCounts[c]})
            </button>
          ))}
        </div>

        {/* Country filter */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[0.65rem] text-neutral-400 font-medium mr-1 self-center">国家：</span>
          <button onClick={() => setCountryFilter('')} className={`px-2.5 py-1 text-[0.7rem] rounded-md border transition-colors font-normal ${!countryFilter ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>全部</button>
          {countries.map(c => (
            <button key={c} onClick={() => setCountryFilter(countryFilter === c ? '' : c)}
              className={`px-2.5 py-1 text-[0.7rem] rounded-md border transition-colors font-normal ${countryFilter === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
              {c} ({countryCounts[c]})
            </button>
          ))}
        </div>
      </div>

      {/* Brand cards — grouped by category */}
      {Object.entries(grouped).map(([cat, brands]) => (
        <div key={cat} className="mb-6">
          {sortKey === 'category' && (
            <h2 className="text-[0.7rem] tracking-[0.12em] uppercase text-neutral-400 font-medium mb-2 px-1">{cat} · {brands.length} 品牌</h2>
          )}
          <div className="space-y-2">
            {brands.map((p) => {
              const i = p._idx
              return (
                <div key={i} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                  <button onClick={() => toggle(i)} className="w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[0.9rem] font-semibold text-neutral-900">{highlight(p.brand)}</span>
                        {sortKey !== 'category' && <span className="text-[0.62rem] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded font-normal">{p.category}</span>}
                        <span className="text-[0.62rem] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded font-normal">{p.category}</span>
                    <span className="text-[0.62rem] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-normal">{p.country}</span>
                      </div>
                      <span className="text-[0.65rem] text-neutral-400 shrink-0 ml-2">{expanded.has(i) ? '收起 ▲' : '详情 ▼'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5">
                      <span className="text-[0.7rem] text-neutral-500 font-normal truncate max-w-[240px]">{highlight(p.style)}</span>
                      <span className="text-[0.72rem] text-neutral-600 font-medium">{p.priceRange}</span>
                    </div>
                  </button>
                  {expanded.has(i) && (
                    <div className="px-4 pb-4 border-t border-neutral-100">
                      <div className="mt-3 space-y-3">
                        {p.series && (
                          <div className="border-l-2 border-blue-200 pl-3">
                            <span className="inline-block text-[0.6rem] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mb-1">订货系列</span>
                            <p className="text-[0.75rem] text-neutral-700 font-normal whitespace-pre-line">{p.series}</p>
                          </div>
                        )}
                        {(p.ss26 || p.aw26) && (
                          <div className="grid md:grid-cols-2 gap-3">
                            {p.ss26 && (
                              <div className="border-l-2 border-amber-200 pl-3">
                                <span className="inline-block text-[0.6rem] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded mb-1">26SS 订货政策</span>
                                <p className="text-[0.75rem] text-neutral-700 font-normal whitespace-pre-line">{p.ss26}</p>
                              </div>
                            )}
                            {p.aw26 && (
                              <div className="border-l-2 border-emerald-200 pl-3">
                                <span className="inline-block text-[0.6rem] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded mb-1">26AW 订货政策</span>
                                <p className="text-[0.75rem] text-neutral-700 font-normal whitespace-pre-line">{p.aw26}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {p.delivery && (
                          <div className="border-l-2 border-neutral-200 pl-3">
                            <span className="inline-block text-[0.6rem] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded mb-1">计划发货时间</span>
                            <p className="text-[0.75rem] text-neutral-700 font-normal whitespace-pre-line">{p.delivery}</p>
                          </div>
                        )}
                      </div>
                      {p.nonCutoff && (
                        <div className="mt-3 border-l-2 border-purple-200 pl-3">
                          <span className="inline-block text-[0.6rem] font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded mb-1">非截单时间 / 补货沟通</span>
                          <p className="text-[0.72rem] text-neutral-600 font-normal whitespace-pre-line">{p.nonCutoff}</p>
                        </div>
                      )}
                      {p.pr && (
                        <div className="mt-3 border-l-2 border-rose-200 pl-3">
                          <span className="inline-block text-[0.6rem] font-medium bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded mb-1">明星公关</span>
                          <p className="text-[0.72rem] text-neutral-600 font-normal whitespace-pre-line">{p.pr}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-[0.85rem] text-neutral-400 text-center py-16">没有匹配的品牌</p>
      )}
    </div>
  )
}
