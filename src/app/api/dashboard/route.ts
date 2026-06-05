import { NextRequest, NextResponse } from 'next/server'
import { prisma, getSessionFromCookies, getVisibleDeptIds } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Non-admin users only see docs for their department
  const docWhere: Record<string, unknown> = {}
  if (session.role !== 'super_admin') {
    const deptIds = await getVisibleDeptIds(session)
    docWhere.OR = [
      { ownerDeptId: { in: deptIds } },
      { audiences: { some: { departmentId: { in: deptIds } } } },
    ]
  }

  const [docCount, deptCount, companyCount, recentDocs] = await Promise.all([
    prisma.document.count({ where: docWhere }),
    prisma.department.count(),
    prisma.company.count(),
    prisma.document.findMany({
      where: docWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        updatedAt: true,
        ownerDept: { select: { name: true, slug: true } },
        audiences: {
          select: { department: { select: { slug: true } } },
          take: 1,
        },
      },
    }),
  ])

  return NextResponse.json({
    docCount,
    deptCount,
    companyCount,
    recentDocs: recentDocs.map(d => ({
      id: d.id,
      title: d.title,
      slug: d.slug,
      category: d.category,
      department: d.ownerDept.name,
      audienceSlug: d.audiences[0]?.department.slug || d.ownerDept.slug,
      updatedAt: d.updatedAt,
    })),
  })
}
