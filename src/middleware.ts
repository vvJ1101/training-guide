import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// basePath '/showroom' is stripped before middleware sees the path
const PUBLIC = ['/login', '/api/auth/login']
const ADMIN_API = ['/api/documents']

/**
 * 🔐 Admin route access check (inline to avoid dynamic import in middleware)
 * Mirrors canAccessAdminRoute from @/lib/permissions/documents
 */
function checkAdminRoute(session: any, pathname: string): boolean {
  if (session.role === 'super_admin') return true

  // User management: super_admin only
  if (pathname.startsWith('/internal/admin/users') || pathname.startsWith('/api/users')) {
    return false
  }

  // Policy upload: 时胜 + 品牌部 + dept_admin
  if (pathname.startsWith('/internal/policy-upload') || pathname === '/api/admin/policy-upload') {
    return session.companyName === '时胜' && session.departmentName === '品牌部'
  }

  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass-through: non-protected paths
  if (!pathname.startsWith('/internal') && !pathname.startsWith('/api') && pathname !== '/login') {
    return NextResponse.next()
  }

  // Public routes
  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Auth required
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let session: any = { role: 'staff' }
  try { session = JSON.parse(sessionCookie.value) } catch {}

  // 🔐 Admin route access control
  if (!checkAdminRoute(session, pathname)) {
    if (pathname.startsWith('/api')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.redirect(new URL('/internal/dashboard', request.url))
  }

  // 🔐 Document API write protection — dept_admin+ for non-GET
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
