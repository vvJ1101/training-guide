import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.redirect(new URL('/showroom/', 'http://120.79.162.27'))
  response.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}
