import { NextRequest, NextResponse } from 'next/server'
import { prisma, getSessionFromCookies, getVisibleDeptIds } from '@/lib/auth'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { sanitizeMarkdown } from '@/lib/sanitize'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      ownerDept: { select: { name: true, slug: true } },
      audiences: { include: { department: { select: { name: true, slug: true } } } },
      author: { select: { name: true } },
    },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check department permission
  if (session.role !== 'super_admin') {
    const deptIds = await getVisibleDeptIds(session)
    const allowed = deptIds.includes(doc.ownerDeptId) ||
      doc.audiences.some(a => deptIds.includes(a.departmentId))
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Return both fullContent and condensedContent, remap for frontend
  const { fullContent, condensedContent, ...rest } = doc
  return NextResponse.json({ ...rest, content: fullContent, fullContent, condensedContent: condensedContent || '' })
}

// PUT — Edit document metadata
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { ownerDept: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // dept_admin can only edit docs in their company
  if (session.role === 'dept_admin') {
    const deptIds = await getVisibleDeptIds(session)
    if (!deptIds.includes(doc.ownerDeptId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { title, category, ownerDeptId, audienceIds, content } = body
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (title) {
    data.title = title
    data.slug = title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 200)
  }
  if (category) data.category = category
  if (ownerDeptId) data.ownerDeptId = ownerDeptId
  if (content !== undefined) data.fullContent = typeof content === 'string' ? content.substring(0, 100000) : undefined
  if (body.condensedContent !== undefined) {
    const raw = typeof body.condensedContent === 'string' ? body.condensedContent.substring(0, 100000) : ''
    data.condensedContent = sanitizeMarkdown(raw)
    // Auto-set displayMode when condensed is provided
    if (data.condensedContent) data.displayMode = 'both'
  }

  // Update audiences if provided
  if (audienceIds !== undefined) {
    await prisma.documentAudience.deleteMany({ where: { documentId: params.id } })
    if (audienceIds.length > 0) {
      await Promise.all(audienceIds.map((deptId: string) =>
        prisma.documentAudience.create({ data: { documentId: params.id, departmentId: deptId } })
          .catch(() => {})
      ))
    }
  }

  const updated = await prisma.document.update({
    where: { id: params.id },
    data,
    include: {
      ownerDept: { select: { name: true, slug: true } },
      audiences: { include: { department: { select: { name: true, slug: true } } } },
      author: { select: { name: true } },
    },
  })

  return NextResponse.json(updated)
}

// DELETE — Delete document
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: { id: true, ownerDeptId: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // dept_admin can only delete docs in their company
  if (session.role === 'dept_admin') {
    const deptIds = await getVisibleDeptIds(session)
    if (!deptIds.includes(doc.ownerDeptId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Delete related records
  await prisma.documentAudience.deleteMany({ where: { documentId: params.id } })
  await prisma.auditLog.deleteMany({ where: { documentId: params.id } })
  await prisma.document.delete({ where: { id: params.id } })

  // Delete uploaded images
  const imgDir = join(process.cwd(), 'public', 'uploads', 'documents', params.id)
  if (existsSync(imgDir)) {
    try { rmSync(imgDir, { recursive: true }) } catch {}
  }

  return NextResponse.json({ ok: true })
}
