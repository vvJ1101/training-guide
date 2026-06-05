import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companySlug = searchParams.get('company')

  const where: Record<string, unknown> = {}
  if (companySlug) {
    where.company = { slug: companySlug }
  }

  const depts = await prisma.department.findMany({
    where,
    select: {
      id: true, name: true, slug: true,
      companyId: true,
      company: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(depts)
}
