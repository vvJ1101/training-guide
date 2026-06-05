import { NextRequest, NextResponse } from 'next/server'
import { verifyLogin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await verifyLogin(email, password)
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, user })
  response.cookies.set('session', JSON.stringify({
    id: user.id,
    role: user.role,
    companyId: user.companyId || '',
    departmentId: user.departmentId || '',
    departmentName: user.departmentName || '',
  }), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return response
}
