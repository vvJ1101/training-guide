'use client'

import { brands } from '@/data/brands'

const [hero, ...rest] = brands.slice(0, 3)

export function BrandsSection() {
  return (
    <section id="brands" className="py-36 md:py-48 section-container">
      <p className="text-[1.15rem] leading-[1.7] text-neutral-700 font-normal max-w-sm mb-16 md:mb-20">
        以策展思维甄选。每个品牌都有独特的美学语言与创作哲学。
      </p>

      {/* Asymmetric — one dominant, two supporting */}
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr] gap-8 md:gap-12">
        <div>
          <div className="aspect-[3/4] overflow-hidden relative mb-5">
            <img src={hero.image!} alt={hero.name} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <h3 className="text-[0.88rem] font-medium tracking-[0.03em] text-neutral-900">{hero.name}</h3>
          <p className="text-[0.65rem] tracking-[0.08em] uppercase text-neutral-500 mt-1.5 font-normal">{hero.category}</p>
        </div>

        <div className="flex flex-col gap-8 md:gap-12 justify-between">
          {rest.map((b) => (
            <div key={b.name}>
              <div className="aspect-[4/5] overflow-hidden relative mb-4">
                <img src={b.image!} alt={b.name} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <h3 className="text-[0.8rem] font-medium tracking-[0.03em] text-neutral-900">{b.name}</h3>
              <p className="text-[0.62rem] tracking-[0.08em] uppercase text-neutral-500 mt-1 font-normal">{b.category}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
