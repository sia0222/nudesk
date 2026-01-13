'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PlayCircle,
  Briefcase,
  ChevronRight,
  Zap,
  Calendar,
  Loader2
} from "lucide-react"
import { motion } from "framer-motion"
import { useTickets } from "@/hooks/use-tickets"
import Link from "next/link"
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  // 실시간 티켓 데이터 조회
  const { data: tickets, isLoading } = useTickets()

  // 실시간 통계 계산
  const stats = [
    { 
      name: '대기 중', 
      value: tickets?.filter(t => t.status === 'WAITING').length || 0, 
      icon: Clock, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      desc: '신규 접수 건' 
    },
    { 
      name: '진행 중', 
      value: tickets?.filter(t => t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS').length || 0, 
      icon: PlayCircle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50', 
      desc: '현재 처리 중' 
    },
    { 
      name: '연기됨', 
      value: tickets?.filter(t => t.status === 'DELAYED').length || 0, 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50', 
      desc: '데드라인 초과' 
    },
    { 
      name: '완료됨', 
      value: tickets?.filter(t => t.status === 'COMPLETED').length || 0, 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      desc: '이번 달 완료' 
    },
  ]

  // 최근 티켓 5개
  const recentTickets = tickets?.slice(0, 5) || []

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 py-6 font-sans">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-zinc-900 italic">Dashboard</h1>
        <p className="text-zinc-500 font-bold">실시간 업무 현황 및 주요 지표를 확인합니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
                <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.name}</CardTitle>
                <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl shadow-inner`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="text-4xl font-black tracking-tighter text-zinc-900">{stat.value}</div>
                <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1 font-bold italic">
                  {stat.desc}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Tickets List */}
        <Card className="lg:col-span-2 border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-10 pb-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tighter italic">Recent Activity</CardTitle>
              <CardDescription className="font-bold text-zinc-400 mt-1">실시간으로 업데이트되는 최근 티켓 목록입니다.</CardDescription>
            </div>
            <Link href="/dashboard/tickets">
              <Button variant="ghost" className="text-xs font-black text-zinc-400 hover:text-zinc-900 gap-1 rounded-xl uppercase tracking-wider">
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-10 pt-4">
            <div className="space-y-4">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className={cn(
                      "flex items-center justify-between rounded-3xl border p-6 transition-all hover:shadow-xl hover:shadow-zinc-50 group",
                      ticket.is_urgent ? "border-red-100 bg-red-50/10" : "border-zinc-50 bg-zinc-50/30"
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-110",
                        ticket.is_urgent ? "bg-red-100 text-red-600" : "bg-white text-zinc-300 border border-zinc-50"
                      )}>
                        <Briefcase className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-zinc-900 tracking-tight text-lg">{ticket.title}</p>
                          {ticket.is_urgent && (
                            <Badge variant="destructive" className="h-5 px-2 rounded-full text-[9px] font-black animate-pulse bg-red-600 border-none">
                              URGENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                          <span className="text-zinc-900">{ticket.project?.name || 'No Project'}</span>
                          <span className="opacity-30">|</span>
                          <span>{ticket.id.slice(0, 8)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                      <span className="text-[10px] font-black text-zinc-300 flex items-center gap-1 uppercase italic">
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ko })}
                      </span>
                      <Badge className={cn(
                        "font-black px-4 py-1 rounded-full text-[9px] shadow-sm border-none",
                        ticket.status === 'WAITING' ? "bg-amber-100 text-amber-600 hover:bg-amber-100" :
                        ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-600 hover:bg-blue-100" :
                        "bg-zinc-100 text-zinc-500 hover:bg-zinc-100"
                      )}>
                        {ticket.status === 'WAITING' ? '대기' : ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS' ? '진행' : '완료'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center border-4 border-dashed rounded-[2.5rem] border-zinc-50 bg-zinc-50/20">
                  <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Briefcase className="h-10 w-10 text-zinc-100" />
                  </div>
                  <p className="text-zinc-300 font-black tracking-tight">최근 등록된 티켓이 없습니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Schedule & System Notice */}
        <div className="space-y-8">
          <Card className="border-none shadow-[0_30px_60px_rgba(0,0,0,0.12)] bg-zinc-900 text-white rounded-[2.5rem] overflow-hidden relative group p-2">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter italic">
                <Calendar className="h-7 w-7 text-zinc-500" /> Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-8 relative z-10">
              <div className="bg-white/5 rounded-3xl p-6 backdrop-blur-xl border border-white/10 shadow-inner">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Jan 13, 2026</p>
                <p className="font-black text-xl mt-3 tracking-tight leading-tight">주간 실무 프로젝트 정기 검토 및 인력 배치 회의</p>
                <p className="text-xs font-bold text-zinc-400 mt-2 flex items-center gap-2 italic">
                  <Clock className="h-3.5 w-3.5" /> 오후 2:00 • 컨퍼런스룸 4C
                </p>
              </div>
              <Button className="w-full h-16 rounded-[1.5rem] bg-white text-zinc-900 font-black text-sm hover:bg-zinc-100 transition-all shadow-xl active:scale-95 border-none">
                상세 일정 확인하기
              </Button>
            </CardContent>
            {/* Background decoration */}
            <div className="absolute -right-16 -top-16 h-48 w-48 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all duration-1000" />
            <div className="absolute -left-16 -bottom-16 h-48 w-48 bg-purple-500/20 rounded-full blur-[80px] group-hover:bg-purple-500/30 transition-all duration-1000" />
          </Card>

          <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.03)] bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4 border-b border-zinc-50">
              <CardTitle className="text-xl font-black tracking-tighter italic">System Notice</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {[
                  { title: 'v1.8 최적화 패치', desc: '데이터 로딩 속도 및 권한 처리 엔진이 개선되었습니다.', date: 'Today' },
                  { title: '서버 정기 점검', desc: '안정적인 서비스를 위해 금일 자정부터 점검이 있습니다.', date: '1d ago' }
                ].map((item, i) => (
                  <div key={i} className="group cursor-pointer relative pl-5 border-l-2 border-zinc-100 hover:border-zinc-900 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black group-hover:text-zinc-900 transition-colors">{item.title}</p>
                      <span className="text-[10px] font-black text-zinc-300 uppercase italic tracking-widest">{item.date}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 font-bold leading-relaxed line-clamp-2 italic">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
