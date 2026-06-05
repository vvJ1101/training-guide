import { NextRequest, NextResponse } from 'next/server'
import { prisma, getSessionFromCookies } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')
  const dtype = searchParams.get('dtype')

  const where: any = {}
  if (department && department !== 'all') {
    where.department = { slug: department }
  }
  if (dtype) {
    where.category = { contains: `|${dtype}` }
  }

  const faqs = await prisma.faq.findMany({
    where,
    include: { department: { select: { name: true, slug: true } } },
    orderBy: [{ departmentId: 'asc' }, { order: 'asc' }],
  })

  return NextResponse.json(faqs)
}
