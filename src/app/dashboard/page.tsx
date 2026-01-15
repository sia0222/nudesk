import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // 홈 메뉴가 삭제되었으므로 자동으로 접수 리스트로 이동
  redirect('/dashboard/tickets')
}
