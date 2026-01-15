'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { LayoutGrid, Users, Briefcase, Settings, LogOut, Loader2, Building2 } from 'lucide-react'
import { signOut, getCurrentSession } from '@/lib/authHelpers'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 세션 체크 및 프로필 로드
  useEffect(() => {
    const checkSession = async () => {
      const session = getCurrentSession()
      if (!session) {
        router.replace('/login')
        return
      }

      // 세션이 있으면 데이터베이스에서 최신 프로필 정보 가져오기
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .single()

        if (error) {
          console.error('Profile fetch error:', error)
          router.replace('/login')
          return
        }

        setProfile(data)
      } catch (error) {
        console.error('Session check error:', error)
        router.replace('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router, supabase])

  const handleLogout = async () => {
    await signOut()
    queryClient.clear()
    router.replace('/login')
  }

  // 메뉴 정보 (요구사항 반영: 홈 메뉴 제외)
  const navItems = [
    { name: '접수 리스트', href: '/dashboard/tickets', icon: Briefcase },
    { name: '인력 관리', href: '/admin/users', icon: Users, roles: ['MASTER', 'ADMIN'] },
    { name: '고객사 관리', href: '/admin/customers', icon: Building2, roles: ['MASTER', 'ADMIN'] },
    { name: '프로젝트 관리', href: '/dashboard/projects', icon: LayoutGrid, roles: ['MASTER', 'ADMIN'] },
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
