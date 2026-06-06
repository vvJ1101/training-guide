import { NextRequest, NextResponse } from 'next/server'
import { prisma, getSessionFromCookies } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get visible department IDs for permission checks
  let deptIds: string[] = []
  if (session.role === 'super_admin') {
    const depts = await prisma.department.findMany({ select: { id: true } })
    deptIds = depts.map(d => d.id)
  } else if (session.companyId) {
    const depts = await prisma.department.findMany({
      where: { companyId: session.companyId },
      select: { id: true },
    })
    deptIds = depts.map(d => d.id)
  } else if (session.departmentId) {
    deptIds = [session.departmentId]
  }

  return NextResponse.json({
    id: session.id,
    role: session.role,
    companyId: session.companyId,
    companyName: session.companyName || '',
    departmentId: session.departmentId,
    departmentName: session.departmentName || '',
    allowedDeptIds: deptIds,
  })
}
