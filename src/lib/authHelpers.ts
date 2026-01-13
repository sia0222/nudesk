import { createClient } from '@/utils/supabase/client'

/**
 * username을 email로 변환 (시스템 규칙)
 * username -> username@nudesk.local
 */
const getEmailFromUsername = (username: string) => `${username}@nudesk.local`

export async function signInWithUsername(username: string, password: string) {
  const supabase = createClient()
  const email = getEmailFromUsername(username)

  // 1. 실제 Supabase Auth 로그인
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    throw authError
  }

  // 2. 실제 DB profiles 테이블 정보 조회
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    throw new Error('프로필 정보를 불러올 수 없습니다.')
  }

  return { user: data.user, profile }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
