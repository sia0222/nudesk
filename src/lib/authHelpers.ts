import { createClient } from '@/utils/supabase/client'

/**
 * 직접 데이터베이스를 사용한 로그인 함수
 * Supabase Auth를 사용하지 않고 profiles 테이블에서 직접 검증
 */
export async function signInWithUsername(username: string, password: string) {
  console.log('[authHelpers] 🚀 Starting database login for:', username)

  const supabase = createClient()

  try {
    // 1. profiles 테이블에서 사용자 정보 조회
    console.log('[authHelpers] 👤 Looking up user in database...')
    console.log('[authHelpers] 🔍 Searching for username:', username)

    // 먼저 모든 사용자 목록을 확인해보기
    const { data: allUsers, error: listError } = await supabase
      .from('profiles')
      .select('*')

    console.log('[authHelpers] 📋 All users in database:', allUsers)
    console.log('[authHelpers] 📋 List error:', listError)

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    console.log('[authHelpers] 🔍 Query result:', { user, userError })

    if (userError || !user) {
      console.error('[authHelpers] ❌ User not found:', userError)
      console.error('[authHelpers] ❌ Available users:', allUsers?.map(u => u.username) || 'none')
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    console.log('[authHelpers] ✅ User found:', user.username)

    // 2. 비밀번호 검증 (간단한 평문 비교 - 실제로는 bcrypt 등으로 해시화해야 함)
    // 현재는 테스트용으로 평문 비교, 실제 운영에서는 해시화 필수
    if (user.password !== password) {
      console.error('[authHelpers] ❌ Password mismatch')
      throw new Error('비밀번호가 일치하지 않습니다.')
    }

    console.log('[authHelpers] ✅ Password verified')

    // 3. 세션 정보 생성 (클라이언트 사이드에서 관리)
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      loggedInAt: new Date().toISOString()
    }

    // 브라우저 localStorage에 세션 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('nudesk_session', JSON.stringify(sessionData))
    }

    console.log('[authHelpers] ✨ Login complete for:', user.username)
    return { user: sessionData, profile: user }

  } catch (error: any) {
    console.error('[authHelpers] 💥 Database login error:', error)
    throw error
  }
}

/**
 * 로그아웃 함수
 */
export async function signOut() {
  console.log('[authHelpers] 👋 Logging out...')

  // 클라이언트 사이드 세션 제거
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nudesk_session')
  }

  console.log('[authHelpers] ✅ Logged out')
}

/**
 * 현재 세션 정보 가져오기
 */
export function getCurrentSession() {
  if (typeof window === 'undefined') return null

  try {
    const session = localStorage.getItem('nudesk_session')
    return session ? JSON.parse(session) : null
  } catch {
    return null
  }
}
