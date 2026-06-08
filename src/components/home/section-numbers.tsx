'use client'

import { motion } from 'framer-motion'
import { byTheNumbers } from '@/data/home'

export function NumbersSection() {
  return (
    <section className="py-32 md:py-40">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-neutral-900 rounded-3xl px-6 py-20 md:py-28 md:px-16 lg:px-24"
        >
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-12 md:grid md:grid-cols-5 md:gap-16">
            {byTheNumbers.map((item) => (
              <div key={item.label} className="text-center min-w-[100px] md:min-w-0">
                <p className="text-[2.5rem] md:text-[4rem] font-light text-white tracking-[-0.02em] leading-none">
                  {item.value}
                </p>
                <p className="text-[0.72rem] text-neutral-400 tracking-[0.08em] mt-4 font-light leading-tight">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
