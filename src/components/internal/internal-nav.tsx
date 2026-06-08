'use client'

import { useEffect, useState } from 'react'

interface Props {
  onMenuClick?: () => void
}

export function InternalNav({ onMenuClick }: Props) {
  const [userName, setUserName] = useState('')

  useEffect(() => {
    fetch('/showroom/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d?.name) setUserName(d.name)
        else if (d?.email) setUserName(d.email.split('@')[0])
      })
      .catch(() => {})
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 bg-white border-b border-neutral-200 flex items-center">
      <div className="w-full px-3 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-9 h-9 shrink-0 text-neutral-600 hover:text-neutral-900"
            aria-label="菜单"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <a href="/showroom/internal/dashboard" className="no-underline shrink-0">
            <span className="text-[0.75rem] md:text-[0.85rem] font-medium tracking-[0.04em] text-neutral-900 whitespace-nowrap">
              YUAN SHOWROOM
            </span>
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {userName && (
            <span className="hidden sm:inline text-[0.72rem] md:text-[0.78rem] text-neutral-500 font-normal truncate max-w-[80px] md:max-w-none">{userName}</span>
          )}
          <a
            href="/showroom/api/auth/logout"
            className="text-[0.7rem] md:text-[0.75rem] text-neutral-400 hover:text-neutral-700 transition-colors no-underline font-normal whitespace-nowrap"
          >
            退出
          </a>
        </div>
      </div>
    </nav>
  )
}
