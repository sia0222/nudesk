import { redirect } from 'next/navigation'

export default function RootPage() {
  // 메인 진입 시 자동으로 대시보드로 리다이렉트 (로그인 여부는 proxy.ts 미들웨어에서 처리)
  redirect('/dashboard')
}
