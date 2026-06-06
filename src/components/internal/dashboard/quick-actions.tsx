'use client'

import Link from 'next/link'

interface Props {
  role: string
}

interface Action {
  label: string; sub: string; icon: string; href: string; roles: string[]
}

const actions: Action[] = [
  { label: '上传文档', sub: '添加新知识', icon: '📤', href: '/internal/documents', roles: ['super_admin', 'dept_admin'] },
  { label: 'AI 解析', sub: '智能结构化', icon: '✨', href: '/internal/documents', roles: ['super_admin', 'dept_admin'] },
  { label: '文档管理', sub: '编辑与整理', icon: '📄', href: '/internal/documents', roles: ['super_admin', 'dept_admin', 'staff'] },
  { label: 'FAQ 管理', sub: '问答维护', icon: '💬', href: '/internal/faq', roles: ['super_admin', 'dept_admin'] },
  { label: '用户管理', sub: '权限配置', icon: '👥', href: '/internal/admin/users', roles: ['super_admin'] },
]

export function QuickActions({ role }: Props) {
  const visible = actions.filter(a => a.roles.includes(role))

  return (
    <section className="mb-10">
      <h2 className="text-[0.75rem] font-medium text-neutral-400 uppercase tracking-wider mb-4">快捷操作</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {visible.map(action => (
          <Link
            key={action.label}
            href={action.href}
            className="bg-white border border-neutral-200/80 rounded-xl px-4 py-4 hover:border-neutral-400 hover:shadow-sm transition-all no-underline group text-center"
          >
            <span className="text-[1.3rem]">{action.icon}</span>
            <p className="text-[0.82rem] font-medium text-neutral-800 mt-1.5 group-hover:text-neutral-900">{action.label}</p>
            <p className="text-[0.68rem] text-neutral-400 font-normal mt-0.5">{action.sub}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
