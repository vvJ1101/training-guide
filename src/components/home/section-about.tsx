'use client'

import { motion } from 'framer-motion'
import { about } from '@/data/home'
import Image from 'next/image'

export function AboutSection() {
  return (
    <section id="about" className="py-28 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <p className="text-[0.72rem] tracking-[0.14em] text-neutral-400 uppercase mb-4 font-medium">About</p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em] text-neutral-900 mb-12">关于我们</h2>
            <div className="space-y-6">
              {about.paragraphs.map((p, i) => (
                <p key={i} className="text-[0.95rem] leading-[1.85] text-neutral-600 font-light">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="aspect-[3/4] bg-neutral-100 rounded-2xl overflow-hidden relative">
            <Image src="/showroom/images/home/about-space.jpeg" alt="YUAN SHOWROOM Space" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
