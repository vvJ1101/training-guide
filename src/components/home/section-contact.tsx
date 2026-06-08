'use client'

import { motion } from 'framer-motion'
import { contact } from '@/data/home'
import Image from 'next/image'

export function ContactSection() {
  return (
    <section id="contact" className="py-28 md:py-36 bg-neutral-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <p className="text-[0.72rem] tracking-[0.14em] text-neutral-400 uppercase mb-8 font-medium">Contact</p>
            <h2 className="text-[2rem] md:text-[2.5rem] font-light tracking-[-0.02em] text-neutral-900 mb-12">联系我们</h2>
            <div className="space-y-8">
              {contact.emails.map((e) => (
                <div key={e.label}>
                  <p className="text-[0.72rem] tracking-[0.08em] text-neutral-400 uppercase mb-1">{e.label}</p>
                  <a href={`mailto:${e.value}`} className="text-[0.95rem] text-neutral-700 hover:text-neutral-900 transition-colors no-underline font-light">{e.value}</a>
                </div>
              ))}
              <div>
                <p className="text-[0.72rem] tracking-[0.08em] text-neutral-400 uppercase mb-1">地址</p>
                <p className="text-[0.95rem] text-neutral-600 font-light">{contact.address}</p>
              </div>
              <div>
                <p className="text-[0.72rem] tracking-[0.08em] text-neutral-400 uppercase mb-1">工作时间</p>
                <p className="text-[0.95rem] text-neutral-600 font-light">{contact.hours}</p>
              </div>
            </div>
          </div>
          <div className="aspect-[4/5] bg-neutral-100 rounded-2xl overflow-hidden relative">
            <Image src="/showroom/images/home/showroom-07.jpeg" alt="Contact YUAN SHOWROOM" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
