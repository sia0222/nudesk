'use server'

import { createClient } from '@/utils/supabase/client'

/**
 * 인력 등록 (직접 데이터베이스 저장)
 * Rules.md 준수: Supabase Auth 미사용, 직접 profiles 테이블에 저장
 */
export async function registerUserAction(formData: {
  username: string
  full_name: string
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER'
  password: string
}) {
  console.log('[registerUserAction] Starting user registration:', formData.username)

  const supabase = createClient()

  try {
    // 1. 사용자명 중복 체크
    console.log('[registerUserAction] Checking username uniqueness...')
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', formData.username)
      .single()

    if (existingUser) {
      console.error('[registerUserAction] Username already exists:', formData.username)
      throw new Error('이미 존재하는 사용자명입니다.')
    }

    // 2. Profiles 테이블에 직접 저장 (Rules.md 준수)
    console.log('[registerUserAction] Inserting user into profiles table...')
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        username: formData.username,
        password: formData.password, // 평문 저장 (개발 단계)
        full_name: formData.full_name,
        role: formData.role,
        is_approved: true // 관리자가 직접 등록한 유저는 자동 승인
      })
      .select()
      .single()

    if (error) {
      console.error('[registerUserAction] Database insertion error:', error)
      throw new Error(error.message)
    }

    console.log('[registerUserAction] User registration successful:', data.username)
    return { success: true, data }

  } catch (error: any) {
    console.error('[registerUserAction] Registration failed:', error)
    throw error
  }
}
