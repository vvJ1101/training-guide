'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AiAnalyzer } from '@/components/internal/ai-analyzer'

interface Doc {
  id: string; title: string; category: string; slug: string; summary?: string
  ownerDept: { name: string; slug: string }; ownerDeptId: string
  audiences: { id: string; departmentId: string; department: { name: string; slug: string } }[]
  author: { name: string }; updatedAt: string
}

interface Department {
  id: string; name: string; slug: string
  companyId: string; company: { id: string; name: string; slug: string }
}

interface Company {
  id: string; name: string; slug: string
}

interface Me {
  id: string; role: string; companyId: string | null
  allowedDeptIds: string[]
}

const CAT_LABELS: Record<string, string> = { training: '培训资料', sop: 'SOP', reference: '企业制度', brand: '品牌资产' }

function DocumentsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const audienceParam = searchParams.get('audience') || 'All'
  const categoryParam = searchParams.get('category') || ''

  const [docs, setDocs] = useState<Doc[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null)

  // Upload form
  const [upTitle, setUpTitle] = useState('')
  const [upFile, setUpFile] = useState<File | null>(null)
  const [upOwnerDept, setUpOwnerDept] = useState('')
  const [upAudienceIds, setUpAudienceIds] = useState<string[]>([])
  const [upCategory, setUpCategory] = useState('training')
  const [upStatus, setUpStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [upMessage, setUpMessage] = useState('')
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; title: string; fullContent: string } | null>(null)
  const [showAiAnalyzer, setShowAiAnalyzer] = useState(false)

  // Edit form
  const [edTitle, setEdTitle] = useState('')
  const [edOwnerDept, setEdOwnerDept] = useState('')
  const [edAudienceIds, setEdAudienceIds] = useState<string[]>([])
  const [edCategory, setEdCategory] = useState('')
  const [edContent, setEdContent] = useState('')
  const [edContentLoading, setEdContentLoading] = useState(false)
  const [edStatus, setEdStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [edMessage, setEdMessage] = useState('')

  const canManage = me?.role === 'super_admin' || me?.role === 'dept_admin'
  const isSuperAdmin = me?.role === 'super_admin'

  // Fetch all data
  useEffect(() => {
    Promise.all([
      fetch('/showroom/api/departments').then(r => r.json()),
      fetch('/showroom/api/companies').then(r => r.json()),
      fetch('/showroom/api/auth/me').then(r => r.json()),
    ]).then(([deps, comps, user]) => {
      if (Array.isArray(deps)) setDepartments(deps)
      if (Array.isArray(comps)) setCompanies(comps)
      if (user?.role) setMe(user)
    }).catch(() => {})
  }, [])

  // Fetch documents
  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (audienceParam !== 'All') p.set('audience', audienceParam)
    if (categoryParam) p.set('category', categoryParam)
    fetch(`/showroom/api/documents?${p}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDocs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [audienceParam, categoryParam])

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'All') params.set(key, value)
    else params.delete(key)
    router.push(`/internal/documents${params.toString() ? `?${params}` : ''}`, { scroll: false })
  }, [searchParams, router])

  // Check if user can manage a specific document
  const canManageDoc = (doc: Doc) => {
    if (!me) return false
    if (me.role === 'super_admin') return true
    if (me.role === 'dept_admin') return me.allowedDeptIds.includes(doc.ownerDeptId)
    return false
  }

  // ── Upload ──
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (upStatus !== 'idle' || !upFile || !upTitle || !upOwnerDept) return
    setUpStatus('uploading')
    const fd = new FormData()
    fd.append('file', upFile)
    fd.append('title', upTitle)
    fd.append('departmentId', upOwnerDept)
    fd.append('category', upCategory)
    fd.append('authorId', me?.id || '')
    if (upAudienceIds.length > 0) fd.append('audienceIds', upAudienceIds.join(','))
    try {
      const res = await fetch('/showroom/api/documents', { method: 'POST', body: fd })
      if (res.ok) {
        const uploaded = await res.json()
        setUploadedDoc({ id: uploaded.id, title: uploaded.title, fullContent: uploaded.fullContent || '' })
        setUpStatus('done'); setUpMessage('上传成功')
        refreshDocs()
      } else {
        const d = await res.json().catch(() => ({}))
        setUpStatus('error'); setUpMessage(d.error || '上传失败')
      }
    } catch { setUpStatus('error'); setUpMessage('网络错误') }
  }

  function resetUpload() {
    setUpTitle(''); setUpFile(null); setUpOwnerDept(''); setUpAudienceIds([])
    setUpCategory('training'); setUpStatus('idle'); setUpMessage('')
    setUploadedDoc(null)
  }

  function refreshDocs() {
    const p = new URLSearchParams()
    if (audienceParam !== 'All') p.set('audience', audienceParam)
    if (categoryParam) p.set('category', categoryParam)
    fetch(`/showroom/api/documents?${p}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDocs(d) })
      .catch(() => {})
  }

  // ── Edit ──
  function openEdit(doc: Doc) {
    setEditingDoc(doc)
    setEdTitle(doc.title)
    setEdOwnerDept(doc.ownerDeptId)
    setEdAudienceIds(doc.audiences.map(a => a.departmentId))
    setEdCategory(doc.category)
    setEdContent('')
    setEdContentLoading(true)
    setEdStatus('idle')
    setEdMessage('')
    setShowEdit(true)
    // Fetch full document content
    fetch(`/showroom/api/documents/${doc.id}`)
      .then(r => r.json())
      .then(d => { if (d?.content) setEdContent(d.content); setEdContentLoading(false) })
      .catch(() => setEdContentLoading(false))
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingDoc || !edTitle) return
    setEdStatus('saving')
    try {
      const res = await fetch(`/showroom/api/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: edTitle, category: edCategory, ownerDeptId: edOwnerDept, audienceIds: edAudienceIds, content: edContent }),
      })
      if (res.ok) {
        setEdStatus('done'); setEdMessage('保存成功')
        setTimeout(() => { setShowEdit(false); setEditingDoc(null); refreshDocs() }, 600)
      } else {
        const d = await res.json().catch(() => ({}))
        setEdStatus('error'); setEdMessage(d.error || '保存失败')
      }
    } catch { setEdStatus('error'); setEdMessage('网络错误') }
  }

  // ── Delete ──
  async function handleDelete(doc: Doc) {
    if (!confirm(`确定删除「${doc.title}」？此操作不可恢复。`)) return
    try {
      const res = await fetch(`/showroom/api/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) refreshDocs()
      else alert('删除失败')
    } catch { alert('网络错误') }
  }

  function deptsByCompany(slug: string) { return departments.filter(d => d.company?.slug === slug) }

  function toggleUpAudience(id: string) {
    setUpAudienceIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }
  function toggleEdAudience(id: string) {
    setEdAudienceIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.3rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">知识库</h1>
          <p className="text-[0.82rem] text-neutral-500 font-normal">
            {docs.length} 份文档
            {audienceParam !== 'All' && ` · ${departments.find(d => d.slug === audienceParam)?.name || audienceParam}`}
            {categoryParam && ` · ${CAT_LABELS[categoryParam] || categoryParam}`}
          </p>
        </div>
        {canManage && (
          <button onClick={() => { resetUpload(); setShowUpload(true) }}
            className="px-4 py-2 bg-neutral-900 text-white text-[0.8rem] font-medium rounded-lg hover:bg-neutral-800 transition-colors">
            + 上传文档
          </button>
        )}
      </div>

      {/* ── Department filter (by company) ── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-[0.65rem] text-neutral-400 font-medium mr-1">部门：</span>
        <button onClick={() => setParam('audience', 'All')}
          className={`px-3 py-1.5 text-[0.72rem] rounded-md border transition-colors font-normal ${audienceParam === 'All' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
          全部
        </button>
        {companies.map(c => {
          const ds = deptsByCompany(c.slug)
          if (!ds.length) return null
          return (
            <span key={c.id} className="inline-flex items-center gap-0.5">
              <span className="text-[0.6rem] text-neutral-300 mx-1">|</span>
              <span className="text-[0.65rem] text-neutral-400 font-medium">{c.name}</span>
              {ds.map(d => (
                <button key={d.id} onClick={() => setParam('audience', d.slug)}
                  className={`px-3 py-1.5 text-[0.72rem] rounded-md border transition-colors font-normal ${audienceParam === d.slug ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
                  {d.name}
                </button>
              ))}
            </span>
          )
        })}
      </div>

      {/* ── Type filter ── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <span className="text-[0.65rem] text-neutral-400 font-medium mr-1">类型：</span>
        {Object.entries(CAT_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setParam('category', categoryParam === k ? '' : k)}
            className={`px-3 py-1.5 text-[0.72rem] rounded-md border transition-colors font-normal ${categoryParam === k ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
            {v}
          </button>
        ))}
      </div>

      {/* ── Doc list ── */}
      {loading ? (
        <p className="text-[0.85rem] text-neutral-400 text-center py-16">加载中...</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[0.9rem] text-neutral-500 mb-1">没有匹配的文档</p>
          <p className="text-[0.78rem] text-neutral-400">尝试切换部门筛选</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div key={doc.id}
              className="flex items-center bg-white border border-neutral-200 rounded-lg hover:border-neutral-400 transition-colors group">
              <Link href={`/internal/docs/${doc.audiences[0]?.department.slug || doc.ownerDept.slug}/${encodeURIComponent(doc.slug)}`}
                className="flex-1 px-4 py-3 no-underline min-w-0">
                <p className="text-[0.85rem] font-normal text-neutral-800 truncate">{doc.title}</p>
                {doc.summary && <p className="text-[0.72rem] text-neutral-400 mt-1 truncate">{doc.summary}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[0.65rem] text-neutral-400">{doc.ownerDept.name}</span>
                  {doc.audiences.length > 0 && <span className="text-[0.65rem] text-neutral-400">· 适用：{doc.audiences.map(a => a.department.name).join('、')}</span>}
                </div>
              </Link>
              <span className="text-[0.7rem] text-neutral-300 font-normal shrink-0 px-3">
                {new Date(doc.updatedAt).toLocaleDateString('zh-CN')}
              </span>
              {canManageDoc(doc) && (
                <div className="shrink-0 pr-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(doc)}
                    className="px-2 py-1 text-[0.7rem] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors">✏️</button>
                  <button onClick={() => handleDelete(doc)}
                    className="px-2 py-1 text-[0.7rem] text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════ Upload Modal ══════════ */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUpload(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[1rem] font-semibold text-neutral-900">上传文档</h2>
                <button onClick={() => setShowUpload(false)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">&times;</button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">标题</label>
                  <input type="text" value={upTitle} onChange={e => setUpTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.85rem] focus:outline-none focus:border-neutral-900 font-normal" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">归属部门</label>
                    <select value={upOwnerDept} onChange={e => setUpOwnerDept(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.85rem] focus:outline-none focus:border-neutral-900 font-normal" required>
                      <option value="">选择部门...</option>
                      {companies.map(c => {
                        const ds = deptsByCompany(c.slug)
                        if (!ds.length) return null
                        return <optgroup key={c.id} label={c.name}>{ds.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">分类</label>
                    <select value={upCategory} onChange={e => setUpCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.85rem] focus:outline-none focus:border-neutral-900 font-normal">
                      {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">适用部门（留空=全部适用）</label>
                  {companies.map(c => {
                    const ds = deptsByCompany(c.slug)
                    if (!ds.length) return null
                    return (
                      <div key={c.id} className="mb-1">
                        <span className="text-[0.6rem] text-neutral-400">{c.name}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {ds.map(d => (
                            <button key={d.id} type="button" onClick={() => toggleUpAudience(d.id)}
                              className={`px-2.5 py-1 text-[0.7rem] rounded border transition-colors font-normal ${upAudienceIds.includes(d.id) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
                              {d.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">文件 (.docx)</label>
                  <input type="file" accept=".docx" onChange={e => { const f = e.target.files?.[0]; if (f) { setUpFile(f); const name = f.name.replace(/\.(docx|doc)$/i, ''); if (!upTitle) setUpTitle(name) } }}
                    className="w-full text-[0.82rem] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[0.78rem] file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 file:transition-colors font-normal" required />
                </div>
                {upMessage && (
                  <div className={`text-[0.78rem] px-3 py-2 rounded-md ${upStatus === 'done' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {upMessage}
                    {upStatus === 'done' && uploadedDoc && (
                      <button
                        onClick={() => setShowAiAnalyzer(true)}
                        className="ml-3 px-3 py-1 text-[0.7rem] font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 transition-colors"
                      >
                        ✨ AI 解析
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowUpload(false)}
                    className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 text-[0.82rem] rounded-lg hover:bg-neutral-50 transition-colors">取消</button>
                  <button type="submit" disabled={upStatus === 'uploading'}
                    className="flex-1 px-4 py-2 bg-neutral-900 text-white text-[0.82rem] rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50">
                    {upStatus === 'uploading' ? '解析中...' : '上传并解析'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Edit Modal ══════════ */}
      {showEdit && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[1rem] font-semibold text-neutral-900">编辑文档</h2>
                <button onClick={() => setShowEdit(false)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">&times;</button>
              </div>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">标题</label>
                  <input type="text" value={edTitle} onChange={e => setEdTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.85rem] focus:outline-none focus:border-neutral-900 font-normal" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">归属部门</label>
                    <select value={edOwnerDept} onChange={e => setEdOwnerDept(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.85rem] focus:outline-none focus:border-neutral-900 font-normal">
                      <option value="">选择部门...</option>
                      {companies.map(c => {
                        const ds = deptsByCompany(c.slug)
                        if (!ds.length) return null
                        return <optgroup key={c.id} label={c.name}>{ds.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">分类</label>
                    <select value={edCategory} onChange={e => setEdCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.85rem] focus:outline-none focus:border-neutral-900 font-normal">
                      {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">适用部门（留空=全部适用）</label>
                  {companies.map(c => {
                    const ds = deptsByCompany(c.slug)
                    if (!ds.length) return null
                    return (
                      <div key={c.id} className="mb-1">
                        <span className="text-[0.6rem] text-neutral-400">{c.name}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {ds.map(d => (
                            <button key={d.id} type="button" onClick={() => toggleEdAudience(d.id)}
                              className={`px-2.5 py-1 text-[0.7rem] rounded border transition-colors font-normal ${edAudienceIds.includes(d.id) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
                              {d.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <label className="block text-[0.72rem] font-medium text-neutral-700 mb-1">
                    文档内容（Markdown）
                    {edContentLoading && <span className="text-neutral-400 ml-1">加载中...</span>}
                  </label>
                  <textarea value={edContent} onChange={e => setEdContent(e.target.value)}
                    rows={14}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.78rem] leading-relaxed focus:outline-none focus:border-neutral-900 font-mono resize-y"
                    placeholder="Markdown 内容..." />
                </div>
                {edMessage && (
                  <div className={`text-[0.78rem] px-3 py-2 rounded-md ${edStatus === 'done' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{edMessage}</div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEdit(false)}
                    className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-600 text-[0.82rem] rounded-lg hover:bg-neutral-50 transition-colors">取消</button>
                  <button type="submit" disabled={edStatus === 'saving'}
                    className="flex-1 px-4 py-2 bg-neutral-900 text-white text-[0.82rem] rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50">
                    {edStatus === 'saving' ? '保存中...' : '保存修改'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Analyzer Modal — shown after upload */}
      {showAiAnalyzer && uploadedDoc && (
        <AiAnalyzer
          documentId={uploadedDoc.id}
          documentTitle={uploadedDoc.title}
          documentCategory={upCategory}
          originalContent={uploadedDoc.fullContent}
          onClose={() => setShowAiAnalyzer(false)}
          onApply={async (draft) => {
            const res = await fetch(`/showroom/api/documents/${uploadedDoc.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: uploadedDoc.title, condensedContent: draft }),
            })
            if (res.ok) {
              setShowAiAnalyzer(false)
              setUploadedDoc(null)
              setShowUpload(false)
              resetUpload()
              refreshDocs()
            } else {
              alert('保存失败')
              throw new Error('Save failed')
            }
          }}
        />
      )}
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-[0.85rem] text-neutral-400">加载中...</div>}>
      <DocumentsContent />
    </Suspense>
  )
}
