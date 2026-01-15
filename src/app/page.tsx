import { redirect } from 'next/navigation'

export default function RootPage() {
  // 메인 진입 시 자동으로 접수 리스트로 리다이렉트
  redirect('/dashboard/tickets')
}
