import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── Companies (upsert to handle existing) ──
  const companiesData = [
    { name: '时胜', slug: 'shisheng', description: '深圳时胜商贸发展有限公司' },
    { name: '圜界', slug: 'huanjie', description: '圜界' },
    { name: '屹圆', slug: 'yiyuan', description: '屹圆' },
    { name: '元睎', slug: 'yuanxi', description: '元睎' },
  ]

  const companies: Record<string, string> = {}
  for (const c of companiesData) {
    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    })
    companies[c.slug] = company.id
  }

  const shishengId = companies['shisheng']

  // ── Update existing departments to belong to 时胜 ──
  const deptSlugs = ['hr', 'finance', 'brand', 'product', 'marketing', 'showroom', 'partner']
  for (const slug of deptSlugs) {
    await prisma.department.updateMany({
      where: { slug },
      data: { companyId: shishengId },
    })
  }

  // ── Admin user (upsert) ──
  const passwordHash = await hash('admin123', 12)
  const hrDept = await prisma.department.findFirst({ where: { slug: 'hr' } })

  await prisma.user.upsert({
    where: { email: 'admin@yuanshowroom.com' },
    update: { companyId: shishengId },
    create: {
      email: 'admin@yuanshowroom.com',
      name: '管理员',
      passwordHash,
      role: 'super_admin',
      companyId: shishengId,
      departmentId: hrDept?.id || '',
    },
  })

  console.log('Seed complete: 4 companies, 7 departments updated → 时胜, admin user updated')
  await prisma.$disconnect()
}

main()
