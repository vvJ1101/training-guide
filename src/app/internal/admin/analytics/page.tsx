'use client'

import { useEffect, useState } from 'react'

interface DeptRow { department: string; company: string; ownedDocs: number; crossDeptViews: number; viewedByOthers: number; usersCount: number }
interface TopDoc { id: string; title: string; department: string; views: number }
interface AnalyticsData { matrix: DeptRow[]; topDocs: TopDoc[]; summary: { totalDepartments: number; totalCrossDeptViews: number; mostConnectedDept: string } }

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/showroom/api/analytics/cross-dept')
      .then(r => r.json())
      .then(d => { if (d?.matrix) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-10"><div className="flex gap-2">{[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-neutral-300 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}</div></div>

  if (!data) return <div className="p-10 text-center text-[0.85rem] text-neutral-500">暂无数据或权限不足</div>

  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <h1 className="text-[1.4rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">📊 跨部门访问分析</h1>
      <p className="text-[0.85rem] text-neutral-500 mb-8">{data.summary.totalDepartments} 个部门 · 跨部门访问 {data.summary.totalCrossDeptViews} 次 · 最活跃：{data.summary.mostConnectedDept}</p>

      {/* Matrix */}
      <section className="mb-8">
        <h2 className="text-[0.8rem] font-medium text-neutral-700 mb-4">部门访问矩阵</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-[0.82rem]">
            <thead>
              <tr className="bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-600">部门</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">公司</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-600">文档数</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-600">跨部查看</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-600">被查看</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-600">用户数</th>
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((d, i) => (
                <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-800">{d.department}</td>
                  <td className="px-4 py-3 text-neutral-500">{d.company}</td>
                  <td className="px-4 py-3 text-right text-neutral-700">{d.ownedDocs}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{d.crossDeptViews || '—'}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{d.viewedByOthers || '—'}</td>
                  <td className="px-4 py-3 text-right text-neutral-500">{d.usersCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Docs */}
      <section>
        <h2 className="text-[0.8rem] font-medium text-neutral-700 mb-4">🔥 热门文档</h2>
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {data.topDocs.map((d, i) => (
            <div key={d.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? 'border-t border-neutral-100' : ''}`}>
              <div>
                <span className="text-[0.7rem] text-neutral-400 mr-3">#{i + 1}</span>
                <span className="text-[0.85rem] text-neutral-800">{d.title}</span>
                <span className="text-[0.72rem] text-neutral-400 ml-2">{d.department}</span>
              </div>
              <span className="text-[0.75rem] font-medium text-neutral-600">{d.views} 次查看</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
