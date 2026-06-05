'use client'

import { navLinks } from '@/data/navigation'

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-offwhite/95 backdrop-blur-sm">
      <div className="section-container flex items-center justify-between h-16">
        <a href="#" className="no-underline">
          <span className="text-[0.82rem] font-light tracking-[0.12em] uppercase text-neutral-900">
            YUAN SHOWROOM
          </span>
        </a>
        <div className="flex items-center gap-6 md:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.7rem] tracking-[0.08em] text-neutral-600 hover:text-neutral-900 transition-colors duration-200 no-underline font-normal"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
