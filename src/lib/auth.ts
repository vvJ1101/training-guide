import { PrismaClient } from '@prisma/client'
import { compare, hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export interface SessionUser {
  id: string; role: string; companyId: string | null; companyName?: string
  departmentId: string; departmentName?: string
}

/** Read session from cookie header string */
export function getSessionFromCookies(cookieHeader: string | null): SessionUser | null {
  if (!cookieHeader) return null
  try {
    const match = cookieHeader.match(/session=([^;]+)/)
    if (!match) return null
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return null
  }
}

export async function verifyLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { department: true, company: true },
  })
  if (!user) return null
  const valid = await compare(password, user.passwordHash)
  if (!valid) return null
  return {
    id: user.id, email: user.email, name: user.name,
    role: user.role as 'super_admin' | 'dept_admin' | 'staff',
    companyId: user.companyId, companyName: user.company?.name ?? '',
    departmentId: user.departmentId, departmentName: user.department?.name ?? '',
  }
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { department: true, company: true } })
}

export async function hashPassword(password: string) {
  return hash(password, 12)
}

export async function getVisibleDeptIds(session: SessionUser): Promise<string[]> {
  if (session.role === 'super_admin') {
    const depts = await prisma.department.findMany({ select: { id: true } })
    return depts.map(d => d.id)
  }
  // dept_admin and staff: only see departments in their company
  if (session.companyId) {
    const depts = await prisma.department.findMany({
      where: { companyId: session.companyId },
      select: { id: true },
    })
    return depts.map(d => d.id)
  }
  return session.departmentId ? [session.departmentId] : []
}

// ── Unified RBAC Permission Functions ──

/** super_admin only: user management */
export function canManageUsers(session: SessionUser): boolean {
  return session.role === 'super_admin'
}

/** super_admin OR (时胜 + 品牌部 + dept_admin) */
export function canEditPolicy(session: SessionUser): boolean {
  if (session.role === 'super_admin') return true
  if (session.role === 'dept_admin' &&
      session.companyName === '时胜' &&
      session.departmentName === '品牌部') {
    return true
  }
  return false
}

// ── Document permissions → migrated to @/lib/permissions/documents ──
// Import from there: canReadDocument, canEditDocument, canDeleteDocument, buildDocumentWhere

export { prisma }
