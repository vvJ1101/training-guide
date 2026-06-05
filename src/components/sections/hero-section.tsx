'use client'

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center section-container pt-28 pb-24 md:pb-32">
      <div className="w-full grid md:grid-cols-[1fr_1fr] gap-16 md:gap-24 lg:gap-32 items-center">
        {/* Left */}
        <div className="order-2 md:order-1">
          <h1 className="text-[3rem] md:text-[4.5rem] lg:text-[5.5rem] font-light leading-[0.92] tracking-[0.03em] uppercase text-neutral-900">
            YUAN<br />SHOWROOM
          </h1>
          <p className="mt-10 text-[0.95rem] md:text-[1rem] text-neutral-600 font-normal leading-[1.6] max-w-[260px]">
            连接品牌、买手与当代零售语境。
          </p>
        </div>

        {/* Right — editorial image with real presence */}
        <div className="order-1 md:order-2">
          <div className="aspect-[3/4] max-w-[320px] md:max-w-[420px] ml-auto relative">
            <img
              src="/showroom/images/editorial/about-feature.png"
              alt=""
             
              className="absolute inset-0 w-full h-full object-cover"
              
            />
          </div>
        </div>
      </div>
    </section>
  )
}
