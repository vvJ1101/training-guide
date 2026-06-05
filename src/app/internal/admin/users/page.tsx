'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string; email: string; name: string; role: string
  companyId: string | null; company: { id: string; name: string; slug: string } | null
  departmentId: string | null; department: { name: string; slug: string } | null
  createdAt: string
}

const roleLabels: Record<string, string> = {
  super_admin: '超级管理员', dept_admin: '部门管理员', staff: '普通员工',
}

interface Dept {
  id: string; name: string; slug: string
  companyId: string; company: { id: string; name: string; slug: string }
}

interface CompanyItem {
  id: string; name: string; slug: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Dept[]>([])
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'staff', companyId: '', departmentId: '' })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  async function loadData() {
    try {
      const [usersRes, deptsRes, companiesRes] = await Promise.all([
        fetch('/showroom/api/users'),
        fetch('/showroom/api/departments'),
        fetch('/showroom/api/companies'),
      ])
      const usersData = await usersRes.json()
      const deptsData = await deptsRes.json()
      const companiesData = await companiesRes.json()
      if (Array.isArray(usersData)) setUsers(usersData)
      if (Array.isArray(deptsData)) setDepartments(deptsData)
      if (Array.isArray(companiesData)) setCompanies(companiesData)
    } catch (err: any) {
      setUsers([])
      setMessageType('error'); setMessage('加载失败: ' + (err?.message || ''))
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function resetForm() {
    setForm({ email: '', name: '', password: '', role: 'staff', companyId: '', departmentId: '' })
    setEditingId(null)
    setShowForm(false)
  }

  // Filter departments by selected company
  const filteredDepts = form.companyId
    ? departments.filter(d => d.companyId === form.companyId)
    : departments

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (editingId) {
      const res = await fetch('/showroom/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId, name: form.name, role: form.role,
          companyId: form.companyId || null,
          departmentId: form.departmentId || null,
          ...(form.password ? { password: form.password } : {}),
        }),
      })
      if (res.ok) {
        loadData(); resetForm()
        setMessageType('success'); setMessage('用户已更新')
      } else {
        let d: any = {}
        try { d = await res.json() } catch {}
        setMessageType('error'); setMessage(d.error || '更新失败')
      }
    } else {
      try {
        const res = await fetch('/showroom/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const d = await res.json()
        if (res.ok) {
          loadData(); resetForm()
          setMessageType('success'); setMessage('用户创建成功')
        } else {
          setMessageType('error'); setMessage(d.error || '创建失败')
        }
      } catch (err: any) {
        setMessageType('error')
        setMessage('创建失败: ' + (err?.message || String(err)))
      }
    }
  }

  function startEdit(u: User) {
    setForm({
      email: u.email, name: u.name, password: '',
      role: u.role, companyId: u.companyId || '', departmentId: u.departmentId || '',
    })
    setEditingId(u.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该用户？')) return
    await fetch(`/showroom/api/users?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  if (loading) return <div className="p-8 text-[0.85rem] text-neutral-400">加载中...</div>

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-[1.3rem] md:text-[1.5rem] font-semibold tracking-[-0.02em] text-neutral-900 mb-1">用户管理</h1>
          <p className="text-[0.8rem] md:text-[0.85rem] text-neutral-500 font-normal">{users.length} 个用户</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="px-4 py-2 bg-neutral-900 text-white text-[0.8rem] font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          {showForm ? '取消' : '新建用户'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 text-[0.82rem] rounded-lg font-normal ${
          messageType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
          {messageType === 'success' ? '✓ ' : '✗ '}{message}
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-5 bg-white border border-neutral-200 rounded-xl space-y-4">
          <h2 className="text-[0.9rem] font-semibold text-neutral-900">{editingId ? '编辑用户' : '新建用户'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.7rem] font-medium text-neutral-700 mb-1">邮箱</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.82rem] focus:outline-none focus:border-neutral-900 font-normal"
                required disabled={!!editingId} />
            </div>
            <div>
              <label className="block text-[0.7rem] font-medium text-neutral-700 mb-1">姓名</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.82rem] focus:outline-none focus:border-neutral-900 font-normal" />
            </div>
            <div>
              <label className="block text-[0.7rem] font-medium text-neutral-700 mb-1">密码{editingId ? '（留空不修改）' : ''}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.82rem] focus:outline-none focus:border-neutral-900 font-normal"
                required={!editingId} />
            </div>
            <div>
              <label className="block text-[0.7rem] font-medium text-neutral-700 mb-1">角色</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.82rem] bg-white focus:outline-none focus:border-neutral-900 font-normal">
                {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[0.7rem] font-medium text-neutral-700 mb-1">公司</label>
              <select
                value={form.companyId}
                onChange={e => setForm({ ...form, companyId: e.target.value, departmentId: '' })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.82rem] bg-white focus:outline-none focus:border-neutral-900 font-normal"
              >
                <option value="">无公司</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[0.7rem] font-medium text-neutral-700 mb-1">部门</label>
              <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[0.82rem] bg-white focus:outline-none focus:border-neutral-900 font-normal">
                <option value="">无部门</option>
                {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}{d.company ? ` (${d.company.name})` : ''}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="px-5 py-2 bg-neutral-900 text-white text-[0.8rem] font-medium rounded-lg hover:bg-neutral-800 transition-colors">
            {editingId ? '保存修改' : '创建用户'}
          </button>
        </form>
      )}

      {/* User list */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[0.8rem] md:text-[0.85rem]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-semibold text-neutral-700 text-[0.75rem]">用户</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700 text-[0.75rem] hidden md:table-cell">角色</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700 text-[0.75rem] hidden md:table-cell">公司</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700 text-[0.75rem] hidden md:table-cell">部门</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-700 text-[0.75rem] hidden md:table-cell">创建时间</th>
                <th className="text-right px-4 py-3 font-semibold text-neutral-700 text-[0.75rem]">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-800">{u.name}</p>
                    <p className="text-[0.7rem] text-neutral-400">{u.email}</p>
                    <div className="md:hidden mt-1 flex gap-2">
                      <span className="text-[0.65rem] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">{roleLabels[u.role]}</span>
                      {u.company && <span className="text-[0.65rem] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">{u.company.name}</span>}
                      {u.department && <span className="text-[0.65rem] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">{u.department.name}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[0.7rem] bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">{roleLabels[u.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{u.company?.name || '-'}</td>
                  <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{u.department?.name || '-'}</td>
                  <td className="px-4 py-3 text-neutral-500 hidden md:table-cell text-[0.75rem]">
                    {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(u)} className="text-[0.72rem] text-neutral-600 hover:text-neutral-900 mr-3">编辑</button>
                    <button onClick={() => handleDelete(u.id)} className="text-[0.72rem] text-red-500 hover:text-red-700">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
