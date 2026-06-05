export function DataSection() {
  return (
    <section className="py-20 md:py-28 section-container bg-neutral-900 text-white">
      <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
        <p className="text-[0.7rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-5">平台数据</p>
        <h2 className="text-[1.8rem] md:text-[2.2rem] font-light tracking-[-0.01em] text-white">
          YUAN SHOWROOM by the Numbers
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 max-w-4xl mx-auto">
        {[
          { n: '50+', l: '合作品牌', sub: '中国、欧洲、亚洲' },
          { n: '4', l: '季/年', sub: '大型主题订货会' },
          { n: '3,000+', l: '买手渠道', sub: '全球精选买手店' },
          { n: '1,000+', l: '季邀约', sub: '买手、媒体与KOL' },
          { n: '20+', l: '覆盖国家', sub: '国际品牌网络' },
        ].map(s => (
          <div key={s.l} className="text-center">
            <p className="text-[1.8rem] md:text-[2.4rem] font-light tracking-[-0.02em] text-white mb-1">{s.n}</p>
            <p className="text-[0.85rem] text-neutral-300 font-normal">{s.l}</p>
            <p className="text-[0.7rem] text-neutral-500 font-normal mt-1">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
