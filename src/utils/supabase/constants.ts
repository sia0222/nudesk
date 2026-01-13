/**
 * Supabase 연결 설정
 */

export const SUPABASE_URL = 'https://rwnwqgrtyrieltlnphow.supabase.co';

// [주의] 클라이언트 브라우저용 키
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bndxZ3J0eXJpZWx0bG5waG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjYxMTgsImV4cCI6MjA4Mzg0MjExOH0.ck2tjBaJGfcDNu187GzcAGCA72IelURvsc2qHoXaOE0'; 

// [주의] 서버 사이드 관리자용 키 (절대 클라이언트에 노출 금지)
export const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bndxZ3J0eXJpZWx0bG5waG93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2NjExOCwiZXhwIjoyMDgzODQyMTE4fQ.39Snl1X3XLJnSMblkOsoFJ8KrkbYmN0oyG22F2mlNPg';

export const DATABASE_URL = "postgresql://postgres.rwnwqgrtyrieltlnphow:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
export const DIRECT_URL = "postgresql://postgres.rwnwqgrtyrieltlnphow:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
