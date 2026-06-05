export function AboutSection() {
  return (
    <section id="about" className="py-24 md:py-32 section-container">
      <div className="max-w-3xl">
        <p className="text-[0.7rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-6">关于我们 · About Us</p>
        <p className="text-[1.1rem] md:text-[1.15rem] leading-[1.9] text-neutral-700 font-normal mb-5">
          YUAN SHOWROOM 是一家总部位于深圳和香港的综合性国际时尚品牌管理机构。
          我们独家运营来自中国、欧洲、亚洲等地的
          <strong className="font-semibold text-neutral-900"> 50+ 设计师品牌</strong>，
          每年在上海举办春夏、盛夏、秋冬、深冬四季大型主题订货会，
          为品牌提供进入中国市场的全链路解决方案。
        </p>
        <p className="text-[1.1rem] md:text-[1.15rem] leading-[1.9] text-neutral-700 font-normal">
          我们是连接创意与市场的桥梁——引入海外品牌进入中国市场，助力本土品牌出海。
          凭借深耕行业多年的核心团队，通过专业销售、资源整合与精细化运营，
          成为品牌在中国市场不可或缺的
          <strong className="font-semibold text-neutral-900">长期商业伙伴</strong>。
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mt-16 md:mt-20 pt-10 border-t border-neutral-200">
        {[
          { n: '50+', l: '合作品牌' },
          { n: '4季/年', l: '时装订货会' },
          { n: '3,000+', l: '买手渠道' },
          { n: '1,000+', l: '季邀约买手' },
        ].map(s => (
          <div key={s.l}>
            <p className="text-[1.6rem] md:text-[2rem] font-light tracking-[-0.01em] text-neutral-900">{s.n}</p>
            <p className="text-[0.78rem] text-neutral-500 font-normal mt-1">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
