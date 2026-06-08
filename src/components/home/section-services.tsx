'use client'

import { motion } from 'framer-motion'
import { services } from '@/data/home'

export function ServicesSection() {
  return (
    <section id="services" className="py-28 md:py-36 bg-neutral-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20"
      >
        <p className="text-[0.72rem] tracking-[0.14em] text-neutral-400 uppercase mb-4 font-medium">Capabilities</p>
        <h2 className="text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em] text-neutral-900 mb-16">核心业务</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div key={s.id} className="bg-white border border-neutral-100 rounded-2xl p-8 md:p-10 hover:border-neutral-300 transition-all duration-300">
              <p className="text-[0.65rem] tracking-[0.12em] text-neutral-300 font-medium mb-6">{s.id}</p>
              <h3 className="text-[1.15rem] font-medium text-neutral-900 mb-3">{s.title}</h3>
              <p className="text-[0.85rem] leading-[1.75] text-neutral-500 font-light">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
