'use client'

import { useEffect, useState } from 'react'

interface Dept {
  id: string; name: string; slug: string
  companyId: string; company: { id: string; name: string; slug: string }
}

interface Company {
  id: string; name: string; slug: string
}

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [ownerDeptId, setOwnerDeptId] = useState('')
  const [audienceIds, setAudienceIds] = useState<string[]>([])
  const [category, setCategory] = useState('training')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [departments, setDepartments] = useState<Dept[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    fetch('/showroom/api/departments')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDepartments(d) })
      .catch(() => {})
    fetch('/showroom/api/companies')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCompanies(d) })
      .catch(() => {})
  }, [])

  function toggleAudience(id: string) {
    setAudienceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title || !ownerDeptId) return
    setStatus('uploading')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('departmentId', ownerDeptId)
    formData.append('category', category)
    formData.append('authorId', 'default')
    if (audienceIds.length > 0) {
      formData.append('audienceIds', audienceIds.join(','))
    }
    try {
      const res = await fetch('/showroom/api/documents', { method: 'POST', body: formData })
      if (res.ok) {
        setStatus('done')
        setMessage('文档上传并解析成功。')
      } else {
        setStatus('error')
        const d = await res.json().catch(() => ({}))
        setMessage(d.error || '上传失败，请重试。')
      }
    } catch {
      setStatus('error')
      setMessage('网络错误。')
    }
  }

  const deptsByCompany = (companySlug: string) =>
    departments.filter(d => d.company?.slug === companySlug)

  return (
    <div className="p-8 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">文件上传</h1>
        <p className="text-[0.85rem] text-neutral-500 font-normal">上传 .docx 文件，自动解析为可阅读格式。</p>
      </div>

      <form onSubmit={handleUpload} className="space-y-5">
        <div>
          <label className="block text-[0.75rem] font-medium text-neutral-700 mb-1.5">文档标题</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded-md text-[0.85rem] text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors font-normal" placeholder="输入文档标题" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-neutral-700 mb-1.5">归属部门</label>
            <select value={ownerDeptId} onChange={e => setOwnerDeptId(e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded-md text-[0.85rem] text-neutral-900 bg-white focus:outline-none focus:border-neutral-900 transition-colors font-normal" required>
              <option value="">选择部门...</option>
              {companies.map(company => {
                const depts = deptsByCompany(company.slug)
                if (depts.length === 0) return null
                return (
                  <optgroup key={company.id} label={company.name}>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-neutral-700 mb-1.5">文档分类</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 border border-neutral-300 rounded-md text-[0.85rem] text-neutral-900 bg-white focus:outline-none focus:border-neutral-900 transition-colors font-normal">
              <option value="training">培训资料</option>
              <option value="sop">SOP</option>
              <option value="reference">企业制度</option>
              <option value="brand">品牌资产</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[0.75rem] font-medium text-neutral-700 mb-1.5">适用部门（可多选，留空表示全部适用）</label>
          {companies.map(company => {
            const depts = deptsByCompany(company.slug)
            if (depts.length === 0) return null
            return (
              <div key={company.id} className="mb-1">
                <span className="text-[0.65rem] text-neutral-400 font-medium">{company.name}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {depts.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleAudience(d.id)}
                      className={`px-3 py-1.5 text-[0.72rem] rounded-md border transition-colors font-normal ${
                        audienceIds.includes(d.id)
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-[0.75rem] font-medium text-neutral-700 mb-1.5">选择文件 (.docx)</label>
          <input type="file" accept=".docx" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-[0.85rem] text-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[0.8rem] file:font-medium file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 file:transition-colors font-normal" required />
        </div>

        {message && (
          <div className={`text-[0.82rem] px-3 py-2 rounded-md font-normal ${status === 'done' ? 'bg-green-50 text-green-700' : status === 'error' ? 'bg-red-50 text-red-700' : ''}`}>{message}</div>
        )}

        <button type="submit" disabled={status === 'uploading'} className="px-6 py-2.5 bg-neutral-900 text-white text-[0.82rem] font-medium rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50">
          {status === 'uploading' ? '上传解析中...' : '上传并解析'}
        </button>
      </form>
    </div>
  )
}
