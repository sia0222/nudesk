import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants'

export function createClient() {
  // 환경 변수 아예 무시하고 constants.ts 값만 사용
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
