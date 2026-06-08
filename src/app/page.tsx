'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HeroSection, NumbersSection, AboutSection, ServicesSection, BrandsSection, ShowroomSection, SeasonsSection, ContactSection } from '@/components/home'
import { site } from '@/data/home'

const navLinks = [
  { href: '#about', label: '关于' },
  { href: '#services', label: '业务' },
  { href: '#brands', label: '品牌' },
  { href: '#seasons', label: '订货会' },
  { href: '#contact', label: '联系' },
]

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavClick = () => setMenuOpen(false)

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-100">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20 h-16 flex items-center justify-between">
          <Link href="/" className="text-[0.9rem] font-medium tracking-[0.06em] text-neutral-900 no-underline">YUAN SHOWROOM</Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className="text-[0.78rem] text-neutral-500 hover:text-neutral-900 transition-colors no-underline font-light tracking-[0.04em]">{l.label}</Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          >
            <span className={`block w-5 h-px bg-neutral-900 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
            <span className={`block w-5 h-px bg-neutral-900 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-neutral-900 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
          </button>
        </div>

        {/* Mobile drawer */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-64 border-b border-neutral-100' : 'max-h-0'}`}>
          <div className="px-6 py-4 flex flex-col gap-3">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={handleNavClick} className="text-[0.85rem] text-neutral-600 hover:text-neutral-900 transition-colors no-underline font-light tracking-[0.04em] py-1">{l.label}</Link>
            ))}
          </div>
        </div>
      </nav>

      <HeroSection />
      <NumbersSection />
      <AboutSection />
      <ServicesSection />
      <BrandsSection />
      <ShowroomSection />
      <SeasonsSection />
      <ContactSection />

      <footer className="py-20 border-t border-neutral-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20 text-center">
          <p className="text-[0.78rem] text-neutral-500 font-light tracking-[0.04em]">
            {site.name} © {new Date().getFullYear()} — {site.footer}
          </p>
        </div>
      </footer>
    </main>
  )
}
