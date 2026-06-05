'use client'

import { useState } from 'react'
import { InternalNav } from '@/components/internal/internal-nav'
import { InternalSidebar } from '@/components/internal/internal-sidebar'

export function InternalLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-50">
      <InternalNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <InternalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-60 pt-16">
          {children}
        </main>
      </div>
    </div>
  )
}
