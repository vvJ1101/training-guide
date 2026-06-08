import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/auth'
import { getVisibleDocuments } from '@/lib/permissions/documents'

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = getVisibleDocuments(session)

  // 1. Docs the user has NOT viewed (to-learn)
  const viewedIds = (await prisma.auditLog.findMany({
    where: { userId: session.id, action: 'view', documentId: { not: null } },
    select: { documentId: true },
  })).map(l => l.documentId).filter(Boolean) as string[]
  const viewedSet = new Set(viewedIds)

  // 2. Unread + high-priority docs
  const [unreadImportant, riskDocs, recentDocs, onboardingDocs] = await Promise.all([
    prisma.document.findMany({
      where: { ...where, id: { notIn: viewedIds.length > 0 ? viewedIds : ['__none__'] } },
      orderBy: { updatedAt: 'desc' }, take: 6,
      select: { id: true, title: true, slug: true, category: true, documentType: true, riskLevel: true,
        ownerDept: { select: { name: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }),
    prisma.document.findMany({
      where: { ...where, riskLevel: 'high' },
      select: { id: true, title: true, slug: true, riskLevel: true,
        ownerDept: { select: { name: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
      take: 3,
    }),
    prisma.document.findMany({
      where: { ...where, updatedAt: { gte: new Date(Date.now() - 14*24*60*60*1000) } },
      orderBy: { updatedAt: 'desc' }, take: 5,
      select: { id: true, title: true, slug: true, category: true, updatedAt: true,
        ownerDept: { select: { name: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
    }),
    prisma.document.findMany({
      where: { ...where, OR: [{ category: 'training' }, { documentType: 'training' }, { title: { contains: '入职' } }, { title: { contains: '培训' } }] },
      select: { id: true, title: true, slug: true, category: true,
        ownerDept: { select: { name: true } },
        audiences: { include: { department: { select: { slug: true } } }, take: 1 } },
      take: 4,
    }),
  ])

  // Build task list with reasons
  const tasks: any[] = []

  // Priority 1: Risk docs (must read)
  for (const d of riskDocs) {
    if (!viewedSet.has(d.id)) {
      tasks.push({
        type: 'risk', priority: 'high',
        title: `⚠️ 风险文档：${d.title}`,
        reason: '高风险文档，建议立即查看',
        doc: { id: d.id, title: d.title, slug: d.slug, audienceSlug: (d as any).audiences?.[0]?.department?.slug || d.ownerDept.name },
        action: 'view',
      })
    }
  }

  // Priority 2: Onboarding (must-learn)
  for (const d of onboardingDocs) {
    if (!viewedSet.has(d.id)) {
      tasks.push({
        type: 'onboarding', priority: 'high',
        title: `📖 入职必读：${d.title}`,
        reason: '新员工入职培训材料',
        doc: { id: d.id, title: d.title, slug: d.slug, audienceSlug: (d as any).audiences?.[0]?.department?.slug || d.ownerDept.name },
        action: 'learn',
      })
    }
  }

  // Priority 3: Unread (should-learn)
  for (const d of unreadImportant.slice(0, 4)) {
    tasks.push({
      type: 'unread', priority: 'medium',
      title: `📌 待学习：${d.title}`,
      reason: session.departmentId && d.ownerDept?.name === session.departmentName ? '你所在部门的相关文档' : '推荐阅读',
      doc: { id: d.id, title: d.title, slug: d.slug, audienceSlug: (d as any).audiences?.[0]?.department?.slug || d.ownerDept?.name },
      action: 'learn',
    })
  }

  // Priority 4: Recent updates
  for (const d of recentDocs.slice(0, 3)) {
    tasks.push({
      type: 'recent', priority: 'low',
      title: `🆕 最近更新：${d.title}`,
      reason: `${new Date(d.updatedAt).toLocaleDateString('zh-CN')} 更新`,
      doc: { id: d.id, title: d.title, slug: d.slug, audienceSlug: (d as any).audiences?.[0]?.department?.slug || d.ownerDept?.name },
      action: 'view',
    })
  }

  return NextResponse.json({
    tasks,
    summary: {
      total: tasks.length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
      unreadCount: unreadImportant.length,
      viewedCount: viewedSet.size,
    },
  })
}
