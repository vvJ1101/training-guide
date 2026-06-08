'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Company {
  id: string; name: string; slug: string
}

interface Department {
  id: string; name: string; slug: string
  companyId: string; company: { id: string; name: string; slug: string }
}

interface Props {
  open?: boolean
  onClose?: () => void
}

export function InternalSidebar({ open = true, onClose }: Props) {
  const pathname = usePathname() || ''
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [user, setUser] = useState<{ role: string; companyName: string; departmentName: string } | null>(null)

  useEffect(() => {
    fetch('/showroom/api/companies')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCompanies(d) })
      .catch(() => {})
    fetch('/showroom/api/departments')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDepartments(d) })
      .catch(() => {})
    fetch('/showroom/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d?.role) setUser({ role: d.role, companyName: d.companyName || '', departmentName: d.departmentName || '' }) })
      .catch(() => {})
  }, [])

  const showAdminUsers = user?.role === 'super_admin'
  const showPolicyUpload = user?.role === 'super_admin' ||
    (user?.role === 'dept_admin' && user?.companyName === '时胜' && user?.departmentName === '品牌部')

  const toggleCompany = (slug: string) => {
    setExpanded(prev => ({ ...prev, [slug]: !prev[slug] }))
  }

  const deptsByCompany = (companySlug: string) =>
    departments.filter(d => d.company?.slug === companySlug)

  const linkClass = (href: string) =>
    `block px-3 py-1.5 text-[0.8rem] rounded transition-colors no-underline font-normal ${
      pathname.startsWith(href)
        ? 'bg-neutral-900 text-white'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
    }`

  const childLinkClass = (href: string) =>
    `block px-3 py-1.5 text-[0.78rem] rounded transition-colors no-underline font-normal ${
      pathname.includes(href)
        ? 'bg-neutral-900 text-white'
        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
    }`

  const sidebarContent = (
    <aside className="w-60 h-full bg-white border-r border-neutral-200 overflow-y-auto">
      <nav className="p-4">
        {onClose && (
          <button onClick={onClose} className="lg:hidden flex items-center gap-1 text-[0.75rem] text-neutral-400 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            关闭菜单
          </button>
        )}

        <Link href="/internal/dashboard" className={linkClass('/internal/dashboard')}>🏠 工作台</Link>
        <Link href="/internal/sop" className={linkClass('/internal/sop')}>📋 SOP 流程库</Link>
        <Link href="/internal/search" className={linkClass('/internal/search')}>🔍 全文搜索</Link>
        <Link href="/internal/faq" className={linkClass('/internal/faq')}>💬 常见问题</Link>
        <Link href="/internal/documents" className={linkClass('/internal/documents')}>📚 全部文档</Link>

        <div className="mt-4">
          <p className="text-[0.6rem] tracking-[0.12em] uppercase text-neutral-400 font-medium mb-1.5 px-3">订货政策</p>
          <Link href="/internal/policy" className={linkClass('/internal/policy')}>品牌订货政策</Link>
        </div>

        <div className="mt-4">
          <p className="text-[0.6rem] tracking-[0.12em] uppercase text-neutral-400 font-medium mb-1.5 px-3">知识库</p>
          <Link href="/internal/documents" className={linkClass('/internal/documents')}>全部文档</Link>

          {/* Company → Department tree */}
          {companies.map(company => {
            const depts = deptsByCompany(company.slug)
            const isOpen = expanded[company.slug] ?? false
            return (
              <div key={company.id} className="mt-0.5">
                <button
                  onClick={() => toggleCompany(company.slug)}
                  className="w-full flex items-center gap-1.5 px-3 py-1 text-[0.75rem] font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="truncate">{company.name}</span>
                </button>
                {isOpen && (
                  <div className="ml-3 border-l border-neutral-100 pl-2">
                    {depts.length > 0 ? (
                      depts.map(dept => (
                        <Link
                          key={dept.id}
                          href={`/internal/documents?audience=${dept.slug}`}
                          className={childLinkClass(`audience=${dept.slug}`)}
                        >
                          {dept.name}
                        </Link>
                      ))
                    ) : (
                      <p className="px-3 py-1 text-[0.7rem] text-neutral-300 italic">暂无部门</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-100">
          <Link href="/internal/documents" className={linkClass('/internal/documents')}>文档管理</Link>
          {showAdminUsers && (
            <Link href="/internal/admin/users" className={linkClass('/internal/admin/users')}>用户管理</Link>
          )}
          {showPolicyUpload && (
            <Link href="/internal/policy-upload" className={linkClass('/internal/policy-upload')}>更新订货政策</Link>
          )}
        </div>
      </nav>
    </aside>
  )

  if (onClose) {
    return (
      <>
        <div
          className={`sidebar-overlay fixed inset-0 z-40 bg-black/30 lg:hidden ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
        <div className={`sidebar-drawer fixed left-0 top-0 bottom-0 z-50 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
        <div className="hidden lg:block fixed left-0 top-16 bottom-0 z-30">
          {sidebarContent}
        </div>
      </>
    )
  }

  return <div className="hidden lg:block fixed left-0 top-16 bottom-0 z-30">{sidebarContent}</div>
}
