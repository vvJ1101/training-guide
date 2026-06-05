export function CooperationSection() {
  const steps = [
    { title: '品牌咨询', desc: '初步沟通，品牌定位分析，了解市场需求与合作模式' },
    { title: '商务沟通', desc: '需求匹配，选择合作模式：买断制 / 预存制 / 寄售制' },
    { title: '合作确认', desc: '签订合作协议，Showroom 排期确认，品牌引入规划' },
    { title: '市场推广', desc: '制定市场方案，全域营销执行，品牌落地中国市场支持' },
    { title: '渠道销售', desc: '进入 3000+ 买手渠道网络，订货会发布，持续运营复盘' },
  ]

  return (
    <section className="py-24 md:py-32 section-container">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          <p className="text-[0.7rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-5">合作流程</p>
          <h2 className="text-[1.8rem] md:text-[2.2rem] font-light tracking-[-0.01em] text-neutral-900">
            如何成为 YUAN SHOWROOM 合作品牌
          </h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-neutral-200" />

          <div className="space-y-10 md:space-y-0">
            {steps.map((s, i) => (
              <div key={s.title} className="flex gap-6 md:gap-10 items-start relative md:pb-14 last:pb-0">
                {/* Step number */}
                <div className="shrink-0 w-16 h-16 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[1.1rem] font-light z-10">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="pt-1">
                  <h3 className="text-[1rem] font-semibold text-neutral-900 mb-1.5">{s.title}</h3>
                  <p className="text-[0.9rem] leading-[1.8] text-neutral-600 font-normal max-w-md">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
