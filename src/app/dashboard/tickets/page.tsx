'use client'

import { useState } from 'react'
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Zap, Loader2, AlertCircle, PlusCircle, ClipboardList, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTickets, useCreateTicket } from "@/hooks/use-tickets"
import { useQuery } from "@tanstack/react-query"

export default function TicketsPage() {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    category: '기타' as '수정요청' | '자료요청' | '기타',
    content: '',
    is_urgent: false,
  })

  // 1. 내 프로필 및 소속 프로젝트 정보 조회
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('profiles').select('*, memberships:project_members(project_id)').eq('id', user.id).single()
      return data
    }
  })

  // 2. 내가 참여 중인 프로젝트 목록 조회
  const { data: myProjects } = useQuery({
    queryKey: ['my-projects', profile?.id],
    queryFn: async () => {
      if (!profile) return []
      let query = supabase.from('projects').select('*')
      if (profile.role !== 'MASTER' && profile.role !== 'ADMIN') {
        const projectIds = profile.memberships?.map((m: any) => m.project_id) || []
        query = query.in('id', projectIds)
      }
      const { data } = await query
      return data || []
    },
    enabled: !!profile
  })

  // 3. 티켓 목록 조회 (커스텀 훅 사용)
  const { data: tickets, isLoading: isTicketsLoading, error } = useTickets()
  const createTicketMutation = useCreateTicket()

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.project_id) {
      toast.error('프로젝트를 선택해주세요.')
      return
    }
    
    createTicketMutation.mutate(formData, {
      onSuccess: () => {
        setIsOpen(false)
        setFormData({ title: '', project_id: '', category: '기타', content: '', is_urgent: false })
      }
    })
  }

  if (isProfileLoading || isTicketsLoading) return (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <p className="font-bold text-zinc-900">데이터를 불러오는 중 오류가 발생했습니다.</p>
    </div>
  )

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 py-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-100">
            <ClipboardList className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 italic">접수 리스트</h1>
            <p className="text-zinc-500 font-medium mt-1">
              {profile?.role === 'MASTER' || profile?.role === 'ADMIN' 
                ? '전체 프로젝트의 요청을 실시간으로 관리합니다.' 
                : '소속 프로젝트의 요청 사항을 확인하고 관리합니다.'}
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className={cn(
              "h-14 px-8 rounded-2xl font-black gap-2 shadow-xl transition-all active:scale-95",
              profile?.role === 'CUSTOMER' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100" : "bg-zinc-900 hover:bg-zinc-800 shadow-zinc-100 text-white"
            )}>
              {profile?.role === 'CUSTOMER' ? <ClipboardList className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              {profile?.role === 'CUSTOMER' ? '업무 접수하기' : '새 티켓 등록'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] p-10 border-none shadow-2xl">
            <form onSubmit={handleCreateTicket} className="space-y-8">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tighter italic">
                  {profile?.role === 'CUSTOMER' ? '업무 접수' : '새 티켓 등록'}
                </DialogTitle>
                <DialogDescription className="font-bold text-zinc-400">
                  프로젝트를 선택하고 상세 내용을 작성해주세요.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Project</Label>
                  <Select onValueChange={(v) => setFormData({...formData, project_id: v})} required>
                    <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold px-5">
                      <SelectValue placeholder="프로젝트를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                      {myProjects?.map(p => <SelectItem key={p.id} value={p.id} className="font-bold py-3">{p.name}</SelectItem>)}
                      {myProjects?.length === 0 && <div className="p-4 text-sm text-center text-zinc-400 font-bold">참여 중인 프로젝트가 없습니다.</div>}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Category</Label>
                  <Select onValueChange={(v: any) => setFormData({...formData, category: v})} defaultValue="기타">
                    <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold px-5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                      <SelectItem value="수정요청" className="font-bold py-3">🛠️ 수정요청</SelectItem>
                      <SelectItem value="자료요청" className="font-bold py-3">📂 자료요청</SelectItem>
                      <SelectItem value="기타" className="font-bold py-3">💡 기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Title</Label>
                  <Input 
                    placeholder="업무 제목을 입력하세요" 
                    className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold px-5"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Content</Label>
                  <Textarea 
                    placeholder="상세 내용을 입력하세요" 
                    className="min-h-[140px] rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold px-5 py-4"
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div 
                  className={cn(
                    "flex items-center gap-3 p-5 rounded-2xl border transition-all cursor-pointer",
                    formData.is_urgent ? "bg-red-50 border-red-100" : "bg-zinc-50 border-zinc-100"
                  )}
                  onClick={() => setFormData({...formData, is_urgent: !formData.is_urgent})}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    formData.is_urgent ? "bg-red-500 border-red-500" : "bg-white border-zinc-200"
                  )}>
                    {formData.is_urgent && <Zap className="h-3.5 w-3.5 text-white fill-white" />}
                  </div>
                  <Label className={cn("font-black cursor-pointer", formData.is_urgent ? "text-red-600" : "text-zinc-400")}>🚨 긴급 요청건입니다.</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full h-16 rounded-[1.5rem] bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200" disabled={createTicketMutation.isPending}>
                  {createTicketMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : '접수 완료하기'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="hover:bg-transparent border-zinc-50">
              <TableHead className="w-[120px] font-black py-6 pl-10 text-zinc-400 uppercase text-[10px] tracking-widest">Id</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Project / Title</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Customer</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">Deadline</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket: any) => (
                <TableRow 
                  key={ticket.id}
                  className={cn(
                    "group transition-all border-zinc-50",
                    ticket.is_urgent && "bg-red-50/20 hover:bg-red-50/40"
                  )}
                >
                  <TableCell className="font-mono text-[10px] text-zinc-400 pl-10 font-bold">{ticket.id.slice(0, 8)}</TableCell>
                  <TableCell className="py-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tight leading-none">{ticket.project?.name || '---'}</span>
                      <div className="flex items-center gap-2">
                        {ticket.is_urgent && <Zap className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />}
                        <span className={cn("font-black text-zinc-900 tracking-tight", ticket.is_urgent && "text-red-600")}>{ticket.title}</span>
                        <Badge variant="outline" className="text-[9px] font-black h-4 px-1.5 rounded-md border-zinc-100 bg-white shadow-sm">{ticket.category}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-zinc-500 text-sm">{ticket.customer?.full_name || '---'}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-black px-4 py-1 rounded-full text-[10px] shadow-sm",
                      ticket.status === 'WAITING' ? "bg-amber-100 text-amber-600 hover:bg-amber-100 border-none" :
                      ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-600 hover:bg-blue-100 border-none" :
                      "bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-none"
                    )}>
                      {ticket.status === 'WAITING' ? '대기' : ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS' ? '진행' : '완료'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-black text-zinc-400 text-xs">
                      <Clock className="h-4 w-4 opacity-50" />
                      {new Date(ticket.deadline).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="pr-10">
                    <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-zinc-100 group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center">
                      <ClipboardList className="h-8 w-8 text-zinc-200" />
                    </div>
                    <p className="text-zinc-400 font-black tracking-tight">조회 가능한 티켓이 없습니다.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
