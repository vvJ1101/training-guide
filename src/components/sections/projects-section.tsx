const projects = [
  { name: '上海四季订货会', time: '每年春夏/盛夏/秋冬/深冬', place: '上海', desc: '每季 1,000+ 买手与媒体邀约，打造集订货、艺术装置、社交体验于一体的沉浸式商业空间。' },
  { name: '全国 Pop-up 巡回展', time: '全年多城', place: '全国主要城市', desc: '辅助订货会的全域市场触达，在核心城市商圈呈现品牌快闪体验空间。' },
  { name: '品牌中国市场落地', time: '持续进行', place: '上海 / 深圳 / 全国', desc: '为 50+ 国际品牌提供从市场分析到渠道铺设的全链路中国市场进入方案。' },
  { name: '设计师品牌孵化', time: '持续进行', place: '上海 / 深圳', desc: '从 0 到亿级的品牌成长陪伴，涵盖品牌定位、生产计划到全域营销的深度服务。' },
]

export function ProjectsSection() {
  return (
    <section id="projects" className="py-24 md:py-32 section-container">
      <div className="max-w-3xl mb-12 md:mb-16">
        <p className="text-[0.7rem] tracking-[0.14em] uppercase text-neutral-400 font-medium mb-5">项目案例 · Projects</p>
        <h2 className="text-[1.8rem] md:text-[2.2rem] font-light tracking-[-0.01em] text-neutral-900">
          近期项目
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {projects.map(p => (
          <div key={p.name} className="border border-neutral-200 rounded-xl p-6 md:p-8 hover:border-neutral-400 transition-colors">
            <h3 className="text-[1rem] font-semibold text-neutral-900 mb-2">{p.name}</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[0.72rem] text-neutral-500 font-normal">{p.time}</span>
              <span className="text-neutral-300">·</span>
              <span className="text-[0.72rem] text-neutral-500 font-normal">{p.place}</span>
            </div>
            <p className="text-[0.88rem] leading-[1.8] text-neutral-600 font-normal">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
