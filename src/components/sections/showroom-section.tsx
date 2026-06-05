export function ShowroomSection() {
  return (
    <section id="showroom" className="py-24 md:py-32 section-container">
      <div className="max-w-3xl mb-12 md:mb-16">
        <p className="text-[0.7rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-5">展厅空间 · Showroom</p>
        <h2 className="text-[1.8rem] md:text-[2.2rem] font-light tracking-[-0.01em] text-neutral-900 mb-6">
          上海四季主题订货会
        </h2>
        <p className="text-[1rem] leading-[1.9] text-neutral-700 font-normal max-w-2xl">
          YUAN SHOWROOM 以上海为核心 Showroom 基地，每年呈现春夏、盛夏、秋冬、深冬四季主题订货会。
          突破传统订货会模式，打造集订货、艺术装置、社交体验与餐饮于一体的沉浸式商业空间。
          每季精准邀约 1,000+ 专业买手、时尚媒体与 KOL，辅以全国多城市 Pop-up 展，实现品牌的全域市场触达。
        </p>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['showroom-01', 'showroom-02', 'showroom-03', 'showroom-04'].map((img, i) => (
          <div key={img} className="aspect-[4/3] bg-neutral-100 rounded-lg overflow-hidden">
            <img src={`/showroom/images/showroom/${img}.png`} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  )
}
