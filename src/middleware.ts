import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// basePath '/showroom' is stripped before middleware sees the path
const PUBLIC = ['/login', '/api/auth/login']
const SUPER_ADMIN_ONLY = ['/internal/admin', '/api/users', '/api/admin']
const POLICY_UPLOAD = ['/internal/policy-upload']
const ADMIN_API = ['/api/documents']

/** Check if user can access policy-upload (super_admin OR 时胜+品牌部+dept_admin) */
function canAccessPolicyUpload(session: any): boolean {
  if (session.role === 'super_admin') return true
  if (session.role === 'dept_admin' &&
      session.companyName === '时胜' &&
      session.departmentName === '品牌部') {
    return true
  }
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/internal') && !pathname.startsWith('/api') && pathname !== '/login') {
    return NextResponse.next()
  }

  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let session: any = { role: 'staff' }
  try { session = JSON.parse(sessionCookie.value) } catch {}

  // SUPER_ADMIN_ONLY routes (with policy-upload exception)
  if (SUPER_ADMIN_ONLY.some(p => pathname.startsWith(p)) && session.role !== 'super_admin') {
    // Policy-upload API allows 时胜+品牌部+dept_admin
    if (pathname === '/api/admin/policy-upload' && canAccessPolicyUpload(session)) {
      return NextResponse.next()
    }
    if (pathname.startsWith('/api')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.redirect(new URL('/internal/dashboard', request.url))
  }

  // POLICY_UPLOAD routes — super_admin or 时胜+品牌部+dept_admin
  if (POLICY_UPLOAD.some(p => pathname.startsWith(p))) {
    if (!canAccessPolicyUpload(session)) {
      return NextResponse.redirect(new URL('/internal/dashboard', request.url))
    }
  }

  // ADMIN_API write protection — dept_admin+ for non-GET
  if (ADMIN_API.some(p => pathname.startsWith(p)) && session.role !== 'super_admin' && session.role !== 'dept_admin') {
    if (request.method !== 'GET') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/internal/:path*', '/api/:path*', '/login'],
}
