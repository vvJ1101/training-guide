import { NextRequest, NextResponse } from 'next/server'
import { prisma, getSessionFromCookies } from '@/lib/auth'
import { buildDocumentWhere } from '@/lib/permissions/documents'

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const owner = searchParams.get('owner')
  const audience = searchParams.get('audience')
  const category = searchParams.get('category')

  const conditions: Record<string, unknown>[] = []
  if (category && category !== 'All') conditions.push({ category })
  if (owner && owner !== 'All') conditions.push({ ownerDept: { slug: owner } })
  if (audience && audience !== 'All') {
    conditions.push({
      audiences: { some: { department: { slug: audience } } },
    })
  }

  // Unified permission: ownerDept OR audience includes user's department
  conditions.push(buildDocumentWhere(session))

  const where: Record<string, unknown> = {}
  if (conditions.length > 0) where.AND = conditions

  const docs = await prisma.document.findMany({
    where,
    select: {
      id: true, title: true, slug: true, category: true, updatedAt: true,
      ownerDeptId: true,
      condensedContent: true, fullContent: true,
      ownerDept: { select: { name: true, slug: true } },
      audiences: { include: { department: { select: { name: true, slug: true } } } },
      author: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Add summary: extract one-liner from condensedContent or first sentence of fullContent
  const withSummary = docs.map(doc => {
    let summary = ''
    if (doc.condensedContent) {
      const match = doc.condensedContent.match(/^> (.+)/m)
      if (match) summary = match[1].trim()
    }
    if (!summary && doc.fullContent) {
      summary = doc.fullContent.replace(/[#*>\n]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 80)
    }
    const { condensedContent, fullContent, ...rest } = doc
    return { ...rest, summary }
  })

  return NextResponse.json(withSummary)
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const title = formData.get('title') as string
  const ownerDeptId = formData.get('departmentId') as string
  const category = (formData.get('category') as string) || 'reference'
  const authorId = session?.id || (formData.get('authorId') as string) || 'unknown'

  if (!file || !title || !ownerDeptId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { parseDocx } = await import('@/lib/parser')
  const buffer = Buffer.from(await file.arrayBuffer())

  const doc = await prisma.document.create({
    data: {
      title,
      slug: title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 200),
      fullContent: '',
      category,
      ownerDeptId,
      authorId,
      visibility: 'department',
    },
  })

  const result = await parseDocx(buffer, doc.id)
  const fullContent = result.markdown.substring(0, 100000)

  // Handle audience department assignments
  const audienceIds = (formData.get('audienceIds') as string)?.split(',').filter(Boolean) || []
  if (audienceIds.length > 0) {
    await Promise.all(audienceIds.map((deptId: string) =>
      prisma.documentAudience.create({ data: { documentId: doc.id, departmentId: deptId } })
        .catch(() => {}) // ignore duplicates
    ))
  }

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      fullContent: fullContent,
      displayMode: 'full',
    },
  })

  return NextResponse.json({
    ...updated,
    parseStats: result.stats,
    imageCount: result.imageCount,
    parseWarnings: result.warnings,
  }, { status: 201 })
}
