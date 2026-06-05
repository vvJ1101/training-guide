'use client'

interface Props {
  onMenuClick?: () => void
}

export function InternalNav({ onMenuClick }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-neutral-200 flex items-center safe-top">
      <div className="w-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-10 h-10 -ml-1 text-neutral-600 hover:text-neutral-900"
            aria-label="菜单"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <a href="/showroom/internal/dashboard" className="no-underline">
            <span className="text-[0.8rem] md:text-[0.85rem] font-medium tracking-[0.04em] md:tracking-[0.06em] text-neutral-900">
              YUAN SHOWROOM
            </span>
          </a>
          <span className="hidden md:inline text-[0.6rem] tracking-[0.06em] text-neutral-400 font-normal">深圳（香港）时胜集团</span>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <span className="text-[0.75rem] md:text-[0.78rem] text-neutral-500 font-normal">管理员</span>
          <a
            href="/showroom/api/auth/logout"
            className="text-[0.72rem] md:text-[0.75rem] text-neutral-400 hover:text-neutral-700 transition-colors no-underline font-normal"
          >
            退出
          </a>
        </div>
      </div>
    </nav>
  )
}
