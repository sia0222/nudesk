import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  console.log(`[Proxy] 🔍 Route check: ${path}`)

  const isAuthPage = path === '/login'
  const isSetupPage = path === '/setup'
  const isProtectedPage = path.startsWith('/dashboard') ||
                          path.startsWith('/admin') ||
                          path === '/'

  // 세션 검증은 클라이언트 사이드에서 수행하므로 여기서는 기본적인 라우팅만
  if (isProtectedPage && !isSetupPage) {
    console.log(`[Proxy] 🛡️ Protected route: ${path}`)
  }

  if (isAuthPage) {
    console.log(`[Proxy] 🔓 Auth page: ${path}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
