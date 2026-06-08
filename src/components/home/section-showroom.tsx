'use client'

import { motion } from 'framer-motion'
import { showroomImages } from '@/data/home'
import Image from 'next/image'

export function ShowroomSection() {
  return (
    <section id="showroom" className="py-28 md:py-36 bg-neutral-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20"
      >
        <p className="text-[0.72rem] tracking-[0.14em] text-neutral-400 uppercase mb-4 font-medium">Space</p>
        <h2 className="text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em] text-neutral-900 mb-16">Showroom 空间</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto bg-neutral-100 overflow-hidden rounded-2xl relative">
            <Image src={showroomImages[0].src} alt={showroomImages[0].alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 66vw" />
          </div>
          {showroomImages.slice(1).map((img, i) => (
            <div key={i} className="aspect-[4/3] bg-neutral-100 overflow-hidden rounded-2xl relative">
              <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
