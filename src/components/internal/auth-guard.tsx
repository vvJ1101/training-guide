import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  requireRole?: string[]  // e.g. ['super_admin'] or ['super_admin', 'dept_admin']
}

// Role hierarchy: super_admin > dept_admin > staff
const ROLE_LEVEL: Record<string, number> = { super_admin: 3, dept_admin: 2, staff: 1 }

export function AuthGuard({ children, requireRole }: Props) {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('session')

  // No session → redirect to login
  if (!sessionCookie?.value) {
    redirect('/login')
  }

  // Validate session
  let session: any = null
  try { session = JSON.parse(decodeURIComponent(sessionCookie.value)) } catch {
    redirect('/login')
  }
  if (!session?.id) {
    redirect('/login')
  }

  // Check role requirement
  if (requireRole && requireRole.length > 0) {
    const userLevel = ROLE_LEVEL[session.role] || 0
    const requiredLevel = Math.max(...requireRole.map(r => ROLE_LEVEL[r] || 0))
    if (userLevel < requiredLevel) {
      redirect('/internal/dashboard')
    }
  }

  return <>{children}</>
}
