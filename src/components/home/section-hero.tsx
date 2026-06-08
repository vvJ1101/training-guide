'use client'

import { motion } from 'framer-motion'
import { hero, site } from '@/data/home'
import Link from 'next/link'
import Image from 'next/image'

export function HeroSection() {
  return (
    <section className="min-h-[80vh] flex items-center bg-white pt-16 md:pt-20">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="order-2 lg:order-1 pt-8 lg:pt-0"
          >
            <h1 className="text-[2.2rem] md:text-[3rem] lg:text-[3.5rem] font-light tracking-[-0.03em] text-neutral-900 leading-[1.15] mb-3">
              {hero.title}
            </h1>
            <p className="text-[1.05rem] md:text-[1.25rem] text-neutral-400 font-light tracking-[0.02em] leading-relaxed mb-6">
              {hero.subtitle}
            </p>
            <p className="text-[1.0rem] md:text-[1.08rem] text-neutral-500 font-light leading-relaxed mb-8 max-w-[480px]">
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {site.keywords.map(k => (
                <span key={k} className="text-[0.75rem] tracking-[0.08em] text-neutral-400 uppercase border border-neutral-200 px-3 py-1.5 rounded-full">
                  {k}
                </span>
              ))}
            </div>
            <div className="flex gap-4">
              <Link href={hero.cta.primary.href} className="inline-block px-8 py-3 bg-neutral-900 text-white text-[0.85rem] font-medium rounded-full hover:bg-neutral-800 transition-colors no-underline">
                {hero.cta.primary.label}
              </Link>
              <Link href={hero.cta.secondary.href} className="inline-block px-8 py-3 border border-neutral-300 text-neutral-700 text-[0.85rem] font-medium rounded-full hover:border-neutral-900 hover:text-neutral-900 transition-colors no-underline">
                {hero.cta.secondary.label}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="aspect-[4/5] bg-neutral-100 overflow-hidden relative">
              <Image
                src="/showroom/images/home/hero-main.png"
                alt="YUAN SHOWROOM"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
