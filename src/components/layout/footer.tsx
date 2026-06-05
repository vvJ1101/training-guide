import { navLinks } from '@/data/navigation'

export function Footer() {
  return (
    <footer id="contact" className="py-20 md:py-24 section-container">
      <div className="border-t border-neutral-200 pt-16 md:pt-20">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 md:gap-12">
          {/* Brand */}
          <div>
            <span className="text-[0.85rem] font-light tracking-[0.1em] uppercase text-neutral-900">
              YUAN SHOWROOM
            </span>
            <p className="text-[0.82rem] text-neutral-500 font-normal leading-[1.7] max-w-xs mt-5">
              连接国际品牌与中国市场生态的 Showroom 平台。
            </p>
            <div className="mt-8">
              <a href="/showroom/login" className="text-[0.7rem] text-neutral-400 hover:text-neutral-700 transition-colors no-underline font-normal">
                员工入口 →
              </a>
            </div>
          </div>

          {/* Nav */}
          <div>
            <p className="text-[0.65rem] tracking-[0.12em] uppercase text-neutral-400 font-medium mb-4">导航</p>
            <div className="space-y-2">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} className="block text-[0.82rem] text-neutral-600 hover:text-neutral-900 transition-colors no-underline font-normal">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[0.65rem] tracking-[0.12em] uppercase text-neutral-400 font-medium mb-4">联系我们</p>
            <div className="space-y-2.5">
              <p className="text-[0.82rem] text-neutral-600 font-normal">info@yuanshowroom.com</p>
              <p className="text-[0.82rem] text-neutral-600 font-normal">+86 755 XXXX XXXX</p>
              <p className="text-[0.82rem] text-neutral-600 font-normal">深圳 · 香港 · 上海</p>
            </div>
          </div>

          {/* Social */}
          <div>
            <p className="text-[0.65rem] tracking-[0.12em] uppercase text-neutral-400 font-medium mb-4">关注我们</p>
            <div className="space-y-2">
              <a href="#" className="block text-[0.82rem] text-neutral-600 hover:text-neutral-900 transition-colors no-underline font-normal">Instagram</a>
              <a href="#" className="block text-[0.82rem] text-neutral-600 hover:text-neutral-900 transition-colors no-underline font-normal">微信</a>
              <a href="#" className="block text-[0.82rem] text-neutral-600 hover:text-neutral-900 transition-colors no-underline font-normal">小红书</a>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-neutral-100 flex flex-col md:flex-row justify-between gap-3">
          <p className="text-[0.65rem] text-neutral-400 tracking-[0.06em] font-normal">&copy; 2026 YUAN SHOWROOM</p>
          <p className="text-[0.65rem] text-neutral-400 tracking-[0.06em] font-normal">连接创意与市场</p>
        </div>
      </div>
    </footer>
  )
}
