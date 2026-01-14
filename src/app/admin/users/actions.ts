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
  email?: string
  phone?: string
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
        password: '0000', // 모든 신규 유저 디폴트 비밀번호 0000
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
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

/**
 * 인력 정보 수정
 */
export async function updateUserAction(id: string, formData: {
  username: string
  full_name: string
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER'
  email?: string
  phone?: string
}) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: formData.username,
        full_name: formData.full_name,
        role: formData.role,
        email: formData.email || null,
        phone: formData.phone || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { success: true, data }
  } catch (error: any) {
    throw error
  }
}

/**
 * 비밀번호 초기화 (0000으로 설정)
 */
export async function resetPasswordAction(id: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ password: '0000' })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (error: any) {
    throw error
  }
}
