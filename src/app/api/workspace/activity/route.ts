import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/auth'
import { getVisibleDocuments } from '@/lib/permissions/documents'

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = getVisibleDocuments(session)

  const [recentViews, recentDocs, docCount, aiDocCount, aiParsedDocs, onboardingDocs, sameDeptDocs, allDocs] = await Promise.all([
    // User's recent views
    prisma.auditLog.findMany({
      where: { userId: session.id, action: 'view', documentId: { not: null } },
      orderBy: { createdAt: 'desc' }, take: 5,
      select: { documentId: true, createdAt: true },
    }),
    // Recent updates
    prisma.document.findMany({
      where, orderBy: { updatedAt: 'desc' }, take: 8,
      select: { id: true, title: true, slug: true, category: true, updatedAt: true,
        ownerDept: { select: { name: true, slug: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }),
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, condensedContent: { not: '' } } }),
    // AI parsed docs
    prisma.document.findMany({
      where: { ...where, condensedContent: { not: '' } },
      orderBy: { updatedAt: 'desc' }, take: 10,
      select: { id: true, title: true, slug: true, category: true,
        ownerDept: { select: { name: true, slug: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }),
    // Priority 1: onboarding/training (high priority to-learn)
    prisma.document.findMany({
      where: { ...where, OR: [{ category: 'training' }, { documentType: 'training' }, { title: { contains: '入职' } }, { title: { contains: '培训' } }, { title: { contains: '新人' } }] },
      orderBy: { updatedAt: 'desc' }, take: 6,
      select: { id: true, title: true, slug: true, category: true,
        ownerDept: { select: { name: true, slug: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }),
    // Priority 2: same department (medium priority to-learn)
    session.departmentId ? prisma.document.findMany({
      where: { ...where, ownerDeptId: session.departmentId },
      orderBy: { updatedAt: 'desc' }, take: 6,
      select: { id: true, title: true, slug: true, category: true,
        ownerDept: { select: { name: true, slug: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }) : Promise.resolve([]),
    // Priority 3: all remaining (low priority to-learn)
    prisma.document.findMany({
      where, orderBy: { updatedAt: 'desc' }, take: 10,
      select: { id: true, title: true, slug: true, category: true,
        ownerDept: { select: { name: true, slug: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }),
  ])

  // Resolve recent views
  const viewedIds = Array.from(new Set(recentViews.map(v => v.documentId).filter(Boolean))) as string[]
  let viewedDocs: any[] = []
  if (viewedIds.length > 0) {
    const docs = await prisma.document.findMany({
      where: { id: { in: viewedIds } },
      select: { id: true, title: true, slug: true, category: true,
        ownerDept: { select: { name: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    })
    const m = new Map(docs.map(d => [d.id, d]))
    viewedDocs = viewedIds.map(id => m.get(id)).filter(Boolean)
  }

  const viewedSet = new Set(viewedIds)

  // Build prioritized to-learn list
  const toLearnSeen = new Set<string>()
  const toLearn: any[] = []

  // Priority 1: onboarding/training (未读)
  for (const d of onboardingDocs) {
    if (!viewedSet.has(d.id) && !toLearnSeen.has(d.id)) {
      toLearnSeen.add(d.id)
      toLearn.push({ ...d, priority: 'high', reason: '入职培训必读', department: d.ownerDept.name, audienceSlug: d.audiences[0]?.department.slug || d.ownerDept.slug })
    }
  }

  // Priority 2: same department (未读)
  for (const d of sameDeptDocs) {
    if (!viewedSet.has(d.id) && !toLearnSeen.has(d.id)) {
      toLearnSeen.add(d.id)
      toLearn.push({ ...d, priority: 'medium', reason: `所属部门：${d.ownerDept.name}`, department: d.ownerDept.name, audienceSlug: d.audiences[0]?.department.slug || d.ownerDept.slug })
    }
  }

  // Priority 3: remaining (未读)
  for (const d of allDocs) {
    if (!viewedSet.has(d.id) && !toLearnSeen.has(d.id)) {
      toLearnSeen.add(d.id)
      toLearn.push({ ...d, priority: 'low', reason: '扩展阅读', department: d.ownerDept.name, audienceSlug: d.audiences[0]?.department.slug || d.ownerDept.slug })
    }
  }

  const toLearnCount = toLearn.length

  return NextResponse.json({
    user: { role: session.role, departmentName: session.departmentName || '未分配部门', companyName: session.companyName || '未分配公司' },
    stats: { totalDocs: docCount, aiParsed: aiDocCount, recentlyViewed: viewedSet.size, toLearn: toLearnCount },
    recentViews: viewedDocs.map((d: any) => ({ ...d, viewedAt: recentViews.find(v => v.documentId === d.id)?.createdAt })),
    recentUpdates: recentDocs.map(d => ({ id: d.id, title: d.title, slug: d.slug, category: d.category, department: d.ownerDept.name, audienceSlug: d.audiences[0]?.department.slug || d.ownerDept.slug, updatedAt: d.updatedAt })),
    toLearnDocs: toLearn.slice(0, 8).map((d: any) => ({ id: d.id, title: d.title, slug: d.slug, category: d.category, department: d.department, audienceSlug: d.audienceSlug, priority: d.priority, reason: d.reason })),
    aiParsedDocs: aiParsedDocs.map((d: any) => ({ id: d.id, title: d.title, slug: d.slug, category: d.category, department: d.ownerDept.name, audienceSlug: d.audiences[0]?.department.slug || d.ownerDept.slug })),
    accessibleRange: session.role === 'super_admin' ? '全部文档' : session.departmentId ? '本部门 + audience 包含本部门' : '无部门 — 不可见任何文档',
    editableRange: session.role === 'super_admin' ? '全部' : session.departmentId ? '仅本部门文档' : '无',
  })
}
