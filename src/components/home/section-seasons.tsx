'use client'

import { motion } from 'framer-motion'
import { seasons } from '@/data/home'

export function SeasonsSection() {
  return (
    <section id="seasons" className="py-28 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20"
      >
        <p className="text-[0.72rem] tracking-[0.14em] text-neutral-400 uppercase mb-4 font-medium">Ordering</p>
        <h2 className="text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em] text-neutral-900 mb-16">四季订货会</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {seasons.map((s) => (
            <div key={s.name} className="border border-neutral-100 rounded-2xl p-8 md:p-10 hover:border-neutral-300 transition-all duration-300">
              <p className="text-[2rem] font-light text-neutral-900 tracking-[-0.02em] mb-4">{s.name}</p>
              <p className="text-[0.82rem] leading-[1.7] text-neutral-500 font-light">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
