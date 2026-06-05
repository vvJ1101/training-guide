import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// basePath '/showroom' is stripped before middleware sees the path
const PUBLIC = ['/login', '/api/auth/login']
const SUPER_ADMIN = ['/internal/admin', '/api/users', '/api/admin']
const ADMIN_API = ['/api/documents']

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

  let role = 'staff'
  try { role = JSON.parse(sessionCookie.value).role || 'staff' } catch {}

  if (SUPER_ADMIN.some(p => pathname.startsWith(p)) && role !== 'super_admin') {
    if (pathname.startsWith('/api')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.redirect(new URL('/internal/dashboard', request.url))
  }

  if (ADMIN_API.some(p => pathname.startsWith(p)) && role !== 'super_admin' && role !== 'dept_admin') {
    if (request.method !== 'GET') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/internal/:path*', '/api/:path*', '/login'],
}
