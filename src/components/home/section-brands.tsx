'use client'

import { motion } from 'framer-motion'
import { brands } from '@/data/home'

export function BrandsSection() {
  return (
    <section id="brands" className="py-28 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20"
      >
        <p className="text-[0.72rem] tracking-[0.14em] text-neutral-400 uppercase mb-4 font-medium text-center">Brands</p>
        <h2 className="text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em] text-neutral-900 mb-16 text-center">合作品牌矩阵</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {brands.map((name) => (
            <div key={name} className="aspect-[3/2] bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center p-4 hover:bg-neutral-100 hover:border-neutral-300 hover:scale-[1.02] transition-all duration-300 cursor-default group">
              <span className="text-[0.88rem] md:text-[0.95rem] text-neutral-400 font-light tracking-[0.04em] text-center leading-tight group-hover:text-neutral-700 transition-colors">
                {name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
