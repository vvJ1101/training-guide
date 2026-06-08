/**
 * YUAN SHOWROOM — Document Permission System v3 (FINAL)
 *
 * 🔐 SINGLE SOURCE OF TRUTH for all document permissions
 *
 * READ  ≠ WRITE
 * audience → READ only (never write)
 * ownerDepartmentId → READ + WRITE
 * companyId → never used for permissions (NO company fallback)
 * no departmentId → no access (unless super_admin)
 *
 * SECURITY RULES:
 *   All document queries → getVisibleDocuments() (Prisma where)
 *   All mutations → canEditDocument() at API layer
 *   All admin routes → canAccessAdminRoute() at middleware
 *   Frontend filtering is NOT a security layer
 */

import type { SessionUser } from '@/lib/auth'

// ── Types ──

interface DocLike {
  ownerDeptId?: string | null
  audiences?: { departmentId: string }[] | string[] | null
}

// ── READ ──

/** Extract department IDs from audience (supports populated Prisma objects and raw strings) */
function extractAudienceIds(doc: DocLike): string[] {
  if (!doc.audiences) return []
  return doc.audiences
    .map((a: any) => (typeof a === 'string' ? a : a?.departmentId))
    .filter(Boolean) as string[]
}

/**
 * READ permission.
 * user can READ if: super_admin
 *                 OR (doc.ownerDeptId === user.departmentId)
 *                 OR (doc.audience includes user.departmentId)
 */
export function canReadDocument(user: SessionUser, doc: DocLike): boolean {
  if (user.role === 'super_admin') return true
  if (!user.departmentId) return false

  if (doc.ownerDeptId === user.departmentId) return true

  const audienceIds = extractAudienceIds(doc)
  if (audienceIds.includes(user.departmentId)) return true

  return false
}

// ── WRITE (edit / delete / analyze) ──

/**
 * WRITE permission.
 * user can EDIT if: super_admin
 *                  OR (doc.ownerDeptId === user.departmentId)
 *
 * audience does NOT grant write access.
 * companyId does NOT grant write access.
 * no departmentId → no write access.
 */
export function canEditDocument(user: SessionUser, docOwnerDeptId: string): boolean {
  if (user.role === 'super_admin') return true
  if (!user.departmentId) return false
  return user.departmentId === docOwnerDeptId
}

/** Alias — delete uses same WRITE rule */
export const canDeleteDocument = canEditDocument

// ── Prisma Query Builder (READ only) — SINGLE SOURCE OF TRUTH ──

/**
 * 🔐 SINGLE SOURCE OF TRUTH for all document READ queries.
 *
 * Returns a Prisma `where` clause that filters to only documents the user can READ.
 * Must be used in EVERY `prisma.document.findMany/findFirst/count` call.
 *
 * Must NOT be used for WRITE permission — write must check `canEditDocument()` at API layer.
 *
 * Alias: `buildDocumentWhere` (backward compatible)
 */
export function getVisibleDocuments(user: SessionUser): Record<string, unknown> {
  if (user.role === 'super_admin') return {}
  if (!user.departmentId) return { id: '__IMPOSSIBLE__' }

  return {
    OR: [
      { ownerDeptId: user.departmentId },
      { audiences: { some: { departmentId: user.departmentId } } },
    ],
  }
}

/** @deprecated Use getVisibleDocuments() instead */
export const buildDocumentWhere = getVisibleDocuments

// ── Admin Route Access ──

/**
 * 🔐 Check if user can access a specific admin route.
 * Used by middleware.ts for route-level access control.
 */
export function canAccessAdminRoute(user: SessionUser, pathname: string): boolean {
  if (user.role === 'super_admin') return true

  // User management: super_admin only
  if (pathname.startsWith('/internal/admin/users') || pathname.startsWith('/api/users')) {
    return false
  }

  // Policy upload: 时胜 + 品牌部 + dept_admin
  if (pathname.startsWith('/internal/policy-upload') || pathname === '/api/admin/policy-upload') {
    return user.companyName === '时胜' && user.departmentName === '品牌部'
  }

  // Policy view: all authenticated users
  if (pathname.startsWith('/internal/policy')) return true

  return true
}
