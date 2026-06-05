const services = [
  { idx: '01', title: '品牌代理', desc: '独家运营 50+ 国际设计师品牌，提供品牌定位与市场准入策略支持。' },
  { idx: '02', title: 'Showroom 运营', desc: '上海四季大型沉浸式订货会，集订货、艺术装置、社交与餐饮于一体。' },
  { idx: '03', title: '买手渠道拓展', desc: '覆盖全球 3,000+ 精选买手店及百货商场，精准匹配品牌销售渠道。' },
  { idx: '04', title: '市场推广', desc: '从设计开发建议到新媒体运营的品牌全域营销解决方案。' },
  { idx: '05', title: '订货会运营', desc: '突破传统订货会模式，打造策展式商业体验空间与多城 Pop-up 展。' },
  { idx: '06', title: '品牌战略咨询', desc: '数据驱动的复盘服务，操盘数十个品牌从 0 到亿级的成功经验。' },
]

export function ServicesSection() {
  return (
    <section id="services" className="py-24 md:py-32 section-container">
      <div className="max-w-3xl mb-14 md:mb-20">
        <p className="text-[0.7rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-5">服务内容 · Services</p>
        <h2 className="text-[1.8rem] md:text-[2.2rem] font-light tracking-[-0.01em] text-neutral-900">
          全链路品牌管理服务
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {services.map(s => (
          <div key={s.idx} className="group border border-neutral-200 rounded-xl p-6 md:p-7 hover:border-neutral-400 transition-colors">
            <span className="text-[1.6rem] font-light text-neutral-200 group-hover:text-neutral-300 transition-colors mb-4 block">{s.idx}</span>
            <h3 className="text-[0.95rem] font-semibold text-neutral-900 mb-2">{s.title}</h3>
            <p className="text-[0.85rem] leading-[1.8] text-neutral-600 font-normal">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
