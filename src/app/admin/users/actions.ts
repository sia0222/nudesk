'use server'

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/utils/supabase/constants'

/**
 * 인력 등록 (관리자용 유저 생성)
 * 클라이언트 세션에 영향을 주지 않기 위해 service_role 키를 사용한 별도 클라이언트로 처리합니다.
 */
export async function registerUserAction(formData: {
  username: string
  full_name: string
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER'
  password: string
}) {
  // admin 권한을 가진 별도 클라이언트 생성
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const email = `${formData.username}@nudesk.local`

  // 1. Auth 유저 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      username: formData.username,
      full_name: formData.full_name
    }
  })

  if (authError) {
    console.error('Auth User Creation Error:', authError)
    throw new Error(authError.message)
  }

  // 2. Profiles 테이블에 정보 입력
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      username: formData.username,
      full_name: formData.full_name,
      role: formData.role,
      is_approved: true // 관리자가 직접 등록한 유저는 자동 승인
    })

  if (profileError) {
    console.error('Profile Creation Error:', profileError)
    // Auth 유저는 생성되었으나 프로필 생성 실패 시 롤백 로직이 필요할 수 있음
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  return { success: true }
}
