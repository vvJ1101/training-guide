'use client'

import { useState } from 'react'

export default function AdminPolicyPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [brands, setBrands] = useState<string[]>([])

  function validateAndSet(f: File | undefined) {
    if (!f) { setFile(null); return }
    if (!f.name.endsWith('.xlsx')) {
      setStatus('error'); setMessage('仅支持 .xlsx 格式'); setFile(null); return
    }
    setFile(f); setStatus('idle'); setMessage('')
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (!file.name.endsWith('.xlsx')) { setStatus('error'); setMessage('仅支持 .xlsx 格式'); return }
    setStatus('uploading')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/showroom/api/admin/policy-upload', { method: 'POST', body: formData })
      const d = await res.json()
      if (res.ok) {
        setStatus('done')
        setBrands(d.brands || [])
        setMessage(`上传成功！已更新 ${d.count} 个品牌，旧版本已自动备份。`)
        setFile(null)
      } else {
        setStatus('error')
        setMessage(d.error || '上传失败')
      }
    } catch {
      setStatus('error')
      setMessage('网络错误')
    }
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-[1.3rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">更新订货政策</h1>
        <p className="text-[0.82rem] text-neutral-500 font-normal">上传最新版各品牌订货政策 Excel，自动替换在线展示。</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <form onSubmit={handleUpload} className="space-y-5">
          <div>
            <label className="block text-[0.75rem] font-medium text-neutral-700 mb-1.5">选择 Excel 文件 (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={e => validateAndSet(e.target.files?.[0])}
              className="w-full text-[0.85rem] text-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[0.8rem] file:font-medium file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 file:transition-colors font-normal"
              required
            />
            {file && <p className="text-[0.72rem] text-neutral-400 mt-1.5">已选择：{file.name}（{(file.size / 1024).toFixed(0)} KB）</p>}
          </div>

          {message && (
            <div className={`text-[0.82rem] px-3 py-2 rounded-md font-normal ${
              status === 'done' ? 'bg-green-50 text-green-700' : status === 'error' ? 'bg-red-50 text-red-700' : ''
            }`}>
              {status === 'done' ? '✓ ' : status === 'error' ? '✗ ' : ''}{message}
            {status === 'done' && brands.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {brands.map((b, i) => (
                  <span key={i} className="text-[0.65rem] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-normal">{b}</span>
                ))}
              </div>
            )}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || status === 'uploading'}
            className="px-6 py-2.5 bg-neutral-900 text-white text-[0.82rem] font-medium rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {status === 'uploading' ? '解析中...' : '上传并更新'}
          </button>
        </form>
      </div>

      <div className="mt-4">
        <a href="/showroom/data/policy-template.xlsx" className="text-[0.75rem] text-neutral-500 hover:text-neutral-900 transition-colors underline">
          下载 Excel 模版
        </a>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-[0.72rem] text-amber-700 font-normal">
          仅支持 .xlsx 格式。上传后即时生效，在线政策页自动更新。格式须与模版一致（第一行标题、第二行列头、从第三行开始为品牌数据）。
        </p>
      </div>
    </div>
  )
}
