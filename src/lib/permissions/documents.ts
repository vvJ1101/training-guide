/**
 * YUAN SHOWROOM — Document Permission System v3
 *
 * READ  ≠ WRITE
 * audience → READ only (never write)
 * ownerDepartmentId → READ + WRITE
 * companyId → never used for permissions
 * no departmentId → no access (unless super_admin)
 *
 * SECURITY RULE:
 *   All document queries must go through buildDocumentWhere() for READ filtering.
 *   All mutations must call canEditDocument() at the API layer.
 *   Frontend filtering is NOT a security layer.
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

// ── Prisma Query Builder (READ only) ──

/**
 * Build Prisma `where` clause for document READ queries.
 *
 * Filters to only documents the user can READ.
 * Must NOT be used for WRITE permission — write must check at API layer.
 */
export function buildDocumentWhere(user: SessionUser): Record<string, unknown> {
  if (user.role === 'super_admin') return {}
  if (!user.departmentId) return { id: '__IMPOSSIBLE__' }

  return {
    OR: [
      { ownerDeptId: user.departmentId },
      { audiences: { some: { departmentId: user.departmentId } } },
    ],
  }
}
