'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Home, LayoutGrid, Users, Briefcase, Settings, LogOut, Loader2 } from 'lucide-react'
import { signOut } from '@/lib/authHelpers'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'], // 유저별 고유 캐시를 위해 키 단순화 및 즉시 갱신 설정
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) return null
      return data
    },
    staleTime: 0, // 권한 정보는 즉시 반영되도록 캐시 무효화
  })

  const handleLogout = async () => {
    await signOut()
    queryClient.clear() // 모든 캐시 삭제
    router.replace('/login')
  }

  // 메뉴 정보 (요구사항 반영: 승인 관리 제외)
  const navItems = [
    { name: '홈', href: '/dashboard', icon: Home },
    { name: '프로젝트 관리', href: '/dashboard/projects', icon: LayoutGrid, roles: ['MASTER', 'ADMIN'] },
    { name: '인력 관리', href: '/admin/users', icon: Users, roles: ['MASTER', 'ADMIN'] },
    { name: '접수 리스트', href: '/dashboard/tickets', icon: Briefcase },
  ]

  const filteredNavItems = navItems.filter(item => 
    !item.roles || (profile && item.roles.includes(profile.role))
  )

  return (
    <div className="flex h-screen bg-zinc-50 font-sans antialiased text-zinc-900">
      <aside className="w-64 flex flex-col border-r bg-white shadow-sm transition-all">
        <div className="h-20 flex items-center px-8 font-black text-2xl border-b tracking-tighter italic">
          NuDesk
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-1">
            {filteredNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all",
                  pathname === item.href 
                    ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200" 
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                )}>
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </span>
              </Link>
            ))}
          </div>

          <Separator className="my-8 bg-zinc-50" />
          
          <div className="space-y-1">
            <Link href="/dashboard/settings">
              <span className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all",
                pathname === '/dashboard/settings' ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-100"
              )}>
                <Settings className="h-5 w-5" /> 설정
              </span>
            </Link>
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
            >
              <LogOut className="h-5 w-5" /> 로그아웃
            </button>
          </div>
        </ScrollArea>

        {/* 유저 프로필 카드 (권한 정보 강제 갱신) */}
        <div className="p-4 border-t bg-zinc-50/50">
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-xs font-black italic">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (profile?.role?.[0] || '?')}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-black text-zinc-900">{profile?.full_name || '로그인 필요'}</p>
              <p className="truncate text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{profile?.role || '---'}</p>
            </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto bg-white m-3 rounded-[3rem] border shadow-inner">
        <div className="p-10 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
