'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Clock, Zap, Loader2, AlertCircle, PlusCircle, ClipboardList, ChevronRight, Paperclip, Check, X, FileText, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTickets, useCreateTicket } from "@/hooks/use-tickets"
import { useQuery } from "@tanstack/react-query"
import { getCurrentSession } from "@/lib/authHelpers"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfDay, isWeekend } from "date-fns"
import { ko } from "date-fns/locale"
import { getBusinessDate, isBusinessDay, HOLIDAYS_2026 } from "@/lib/date-utils"

export default function TicketsPage() {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false) // 달력 팝오버 상태 추가

  // 카테고리 상수 정의
  const CAT_EMERGENCY = "긴급 / 지금 서비스 이용이 아예 안 돼요!";
  const CAT_ERROR = "오류 / 기능이 마음대로 작동하지 않아요";
  const CAT_REPAIR = "수정 / 화면이 깨지거나 이상하게 보여요";
  const CAT_REQUEST = "요청 / 필요한 자료를 보내주세요";
  const CAT_ADD = "추가 / 이런 기능이 추가되면 좋겠어요";

  // 카테고리 옵션 정의
  const categoryOptions = [
    { label: "🚨 지금 서비스 이용이 아예 안 돼요!", value: CAT_EMERGENCY },
    { label: "🛠️ 기능이 마음대로 작동하지 않아요", value: CAT_ERROR },
    { label: "🎨 화면이 깨지거나 이상하게 보여요", value: CAT_REPAIR },
    { label: "📂 필요한 자료를 보내주세요", value: CAT_REQUEST },
    { label: "➕ 이런 기능이 추가되면 좋겠어요", value: CAT_ADD },
  ]

  const [formData, setFormData] = useState({
    project_id: '',
    category: '', 
    receipt_type: '온라인' as '온라인' | '전화' | '팩스' | '이메일',
    title: '',
    description: '',
    assigned_to_ids: [] as string[],
    end_date: undefined as Date | undefined,
    is_emergency: false,
    emergency_reason: '',
    files: [] as { name: string, size: number, type: string }[] 
  })

  // 카테고리가 긴급일 때 긴급처리요청 강제 활성화 및 해제 방지
  useEffect(() => {
    if (formData.category === CAT_EMERGENCY) {
      if (!formData.is_emergency) {
        setFormData(prev => ({ ...prev, is_emergency: true }));
      }
    }
  }, [formData.category, formData.is_emergency, CAT_EMERGENCY]);

  const dateLimits = useMemo(() => {
    return {
      standardMin: getBusinessDate(3),
      emergencyMin: getBusinessDate(1),
    }
  }, [])

  const session = getCurrentSession()

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      if (!session) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', session.userId).single()
      return data
    },
    enabled: !!session
  })

  const { data: myProjects } = useQuery({
    queryKey: ['my-projects', session?.userId],
    queryFn: async () => {
      if (!session) return []
      const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', session.userId)
      if (!memberships || memberships.length === 0) return []
      const projectIds = memberships.map(m => m.project_id)
      const { data: projects } = await supabase.from('projects').select('*').in('id', projectIds)
      return projects || []
    },
    enabled: !!session
  })

  const { data: projectStaffs } = useQuery({
    queryKey: ['project-staffs', formData.project_id],
    queryFn: async () => {
      if (!formData.project_id) return []
      const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', formData.project_id)
      if (!members || members.length === 0) return []
      const userIds = members.map(m => m.user_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds).in('role', ['ADMIN', 'STAFF'])
      return profiles || []
    },
    enabled: !!formData.project_id
  })

  const { data: tickets, isLoading: isTicketsLoading, error } = useTickets()
  const createTicketMutation = useCreateTicket()

  const toggleStaff = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_to_ids: prev.assigned_to_ids.includes(userId)
        ? prev.assigned_to_ids.filter(id => id !== userId)
        : [...prev.assigned_to_ids, userId]
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles).map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      }));
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.project_id) {
      toast.error('프로젝트를 선택해주세요.')
      return
    }
    if (!formData.category) {
      toast.error('카테고리를 선택해주세요.')
      return
    }

    const minDate = formData.is_emergency ? dateLimits.emergencyMin : dateLimits.standardMin
    if (formData.end_date) {
      const d = startOfDay(formData.end_date);
      if (d < minDate) {
        toast.error(`${formData.is_emergency ? '긴급' : '일반'} 접수는 ${format(minDate, 'yyyy-MM-dd')} 이후부터 선택 가능합니다.`)
        return
      }
      if (!isBusinessDay(d)) {
        toast.error('종료 일자는 주말이나 공휴일일 수 없습니다. 평일을 선택해 주세요.')
        return
      }
    }

    const submissionData = {
      ...formData,
      end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
      file_urls: formData.files.map(f => f.name) 
    };

    createTicketMutation.mutate(submissionData, {
      onSuccess: () => {
        setIsOpen(false)
        setFormData({
          project_id: '', category: '', receipt_type: '온라인', title: '',
          description: '', assigned_to_ids: [], end_date: undefined, is_emergency: false,
          emergency_reason: '', files: []
        })
      }
    })
  }

  return (
    <PageContainer>
      <PageHeader 
        icon={ClipboardList} 
        title="접수 리스트" 
        description={profile?.role === 'MASTER' || profile?.role === 'ADMIN' 
          ? '전체 프로젝트의 요청을 실시간으로 관리합니다.' 
          : '소속 프로젝트의 요청 사항을 확인하고 관리합니다.'}
        iconClassName="bg-blue-600 shadow-blue-100"
      >
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black gap-2 shadow-xl shadow-zinc-200 transition-all active:scale-95">
              {profile?.role === 'CUSTOMER' ? <ClipboardList className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              {profile?.role === 'CUSTOMER' ? '업무 접수하기' : '새 티켓 등록'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[750px] h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl">
            <DialogHeader className="p-10 pb-5 flex-none">
              <DialogTitle className="text-3xl font-black tracking-tighter">
                {profile?.role === 'CUSTOMER' ? '업무 접수' : '새 티켓 등록'}
              </DialogTitle>
              <DialogDescription className="font-bold text-zinc-400">
                상세 정보를 입력하여 업무를 접수해 주세요.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="px-10">
                  <form id="ticket-form" onSubmit={handleCreateTicket} className="space-y-8 pb-10">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1">프로젝트</Label>
                        <Select onValueChange={(v) => setFormData(prev => ({...prev, project_id: v}))} required>
                          <SelectTrigger className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium">
                            <SelectValue placeholder="프로젝트를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                            {myProjects?.map(p => <SelectItem key={p.id} value={p.id} className="font-bold py-3">{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1">접수 카테고리</Label>
                        <Select 
                          onValueChange={(v) => {
                            const isUrgent = (v === CAT_EMERGENCY);
                            setFormData(prev => ({
                              ...prev, 
                              category: v,
                              is_emergency: isUrgent, 
                              end_date: isUrgent ? prev.end_date : undefined
                            }))
                          }} 
                          value={formData.category}
                        >
                          <SelectTrigger className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-bold text-left">
                            <SelectValue placeholder="카테고리를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                            {categoryOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="font-bold py-3">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1">접수유형</Label>
                        <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl">
                          {['온라인', '전화', '팩스', '이메일'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, receipt_type: type as any}))}
                              className={cn(
                                "flex-1 h-12 rounded-xl text-sm font-black transition-all",
                                formData.receipt_type === type 
                                  ? "bg-white text-zinc-900 shadow-sm" 
                                  : "text-zinc-400 hover:text-zinc-600"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1">제목</Label>
                        <Input 
                          placeholder="업무 제목을 입력하세요" 
                          className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                          value={formData.title}
                          onChange={e => setFormData(prev => ({...prev, title: e.target.value}))}
                          required
                        />
                      </div>

                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1">설명</Label>
                        <Textarea
                          placeholder="상세 내용을 입력하세요"
                          className="min-h-[140px] rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 py-4 font-medium"
                          value={formData.description}
                          onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                        />
                      </div>

                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                          내부 인력 배치
                          <span className="text-[10px] text-zinc-400 font-bold uppercase italic">{formData.assigned_to_ids.length}명 선택됨</span>
                        </Label>
                        <div className="bg-zinc-50 rounded-[1.5rem] p-4 border border-zinc-100 min-h-[120px]">
                          <div className="grid grid-cols-2 gap-3">
                            {projectStaffs?.map((staff: any) => (
                              <div
                                key={staff.id}
                                onClick={() => toggleStaff(staff.id)}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                  formData.assigned_to_ids.includes(staff.id)
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                    : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                                )}
                              >
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black italic",
                                  formData.assigned_to_ids.includes(staff.id) ? "bg-zinc-800" : "bg-zinc-100 text-zinc-400"
                                )}>
                                  {staff.role[0]}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-xs font-black truncate">{staff.full_name}</p>
                                  <p className={cn("text-[10px] font-bold opacity-60", formData.assigned_to_ids.includes(staff.id) ? "text-white" : "text-zinc-400")}>{staff.role}</p>
                                </div>
                                {formData.assigned_to_ids.includes(staff.id) && <Check className="h-4 w-4" />}
                              </div>
                            ))}
                            {projectStaffs?.length === 0 && (
                              <div className="col-span-2 py-8 text-center text-zinc-400 text-xs font-bold italic">
                                프로젝트를 먼저 선택해 주세요.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                          종료 일자
                          <span className={cn("text-[10px] font-bold italic", formData.is_emergency ? "text-red-600" : "text-blue-600")}>
                            {formData.is_emergency ? "긴급: 1영업일 이후부터" : "일반: 3영업일 이후부터"}
                          </span>
                        </Label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "h-14 w-full rounded-2xl border-zinc-200 px-5 font-medium justify-start text-left",
                                !formData.end_date && "text-muted-foreground",
                                formData.is_emergency && "border-red-200 bg-red-50/10"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.end_date ? format(formData.end_date, "PPP", { locale: ko }) : <span>종료 일자를 선택하세요</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.end_date}
                              onSelect={(date) => {
                                setFormData(prev => ({...prev, end_date: date}));
                                setIsCalendarOpen(false); // 1. 날짜 선택 시 달력 닫기
                              }}
                              initialFocus
                              disabled={(date) => {
                                const d = startOfDay(date);
                                const t = startOfDay(new Date());
                                
                                // 1. 과거 날짜 비활성화
                                if (d < t) return true;

                                // 2. 최소 영업일 기준 비활성화
                                const minDate = formData.is_emergency ? dateLimits.emergencyMin : dateLimits.standardMin;
                                if (d < minDate) return true;

                                // 3. 주말 비활성화
                                if (isWeekend(d)) return true;

                                // 4. 공휴일 비활성화
                                const dateStr = format(d, 'yyyy-MM-dd');
                                return HOLIDAYS_2026.includes(dateStr);
                              }}
                              locale={ko}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className={cn(
                        "grid gap-6 col-span-2 p-6 rounded-[2rem] border transition-all",
                        formData.is_emergency ? "bg-red-50/50 border-red-100 shadow-inner" : "bg-zinc-50 border-zinc-100 opacity-60"
                      )}>
                        <div className="flex items-center justify-between">
                          <Label 
                            className={cn(
                              "text-sm font-black text-zinc-700 flex items-center gap-2",
                              formData.category === CAT_EMERGENCY ? "cursor-not-allowed" : "cursor-pointer"
                            )}
                            onClick={() => {
                              if (formData.category === CAT_EMERGENCY) {
                                toast.warning('긴급 카테고리에서는 긴급처리가 필수입니다.');
                                return;
                              }
                              
                              setFormData(prev => {
                                const nextUrgent = !prev.is_emergency;
                                return {
                                  ...prev, 
                                  is_emergency: nextUrgent,
                                  end_date: nextUrgent ? prev.end_date : undefined
                                }
                              })
                            }}
                          >
                            <div className={cn(
                              "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              formData.is_emergency ? "bg-red-600 border-red-600 text-white" : "border-zinc-300 bg-white"
                            )}>
                              {formData.is_emergency && <Check className="h-4 w-4" />}
                            </div>
                            긴급처리요청 (체크 시 종료일자 제한 완화)
                          </Label>
                          {formData.is_emergency && <Badge variant="destructive" className="animate-pulse bg-red-600 border-none font-black px-3">URGENT</Badge>}
                        </div>

                        {formData.is_emergency && (
                          <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid gap-2">
                              <Label className="text-xs font-black text-red-600 ml-1">긴급처리 사유</Label>
                              <Textarea 
                                placeholder="긴급 처리가 필요한 구체적인 사유를 입력하세요."
                                className="min-h-[80px] rounded-xl border-red-100 focus:ring-red-600 font-medium bg-white"
                                value={formData.emergency_reason}
                                onChange={e => setFormData(prev => ({...prev, emergency_reason: e.target.value}))}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1">파일첨부 (다중 선택 가능)</Label>
                        <div className="relative group">
                          <input 
                            type="file" 
                            className="hidden" 
                            id="ticket-file"
                            multiple 
                            onChange={handleFileChange}
                          />
                          <label 
                            htmlFor="ticket-file"
                            className="flex items-center justify-center gap-2 w-full h-20 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer font-bold text-zinc-400 hover:text-zinc-900"
                          >
                            <Paperclip className="h-5 w-5" />
                            {'클릭하여 파일을 추가하세요 (여러 개 선택 가능)'}
                          </label>
                        </div>
                        
                        {formData.files.length > 0 && (
                          <div className="mt-4 grid gap-2">
                            {formData.files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-zinc-400" />
                                  <span className="text-xs font-bold text-zinc-600 truncate max-w-[200px]">{file.name}</span>
                                  <span className="text-[10px] text-zinc-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => removeFile(index)}
                                  className="text-zinc-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="p-10 pt-5 border-t bg-zinc-50/50 flex-none">
              <Button 
                type="submit" 
                form="ticket-form"
                className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
                disabled={createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : '접수 완료하기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="hover:bg-transparent border-zinc-50">
              <TableHead className="w-[120px] font-black py-6 pl-10 text-zinc-400 uppercase text-[10px] tracking-widest">아이디</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">프로젝트 / 제목</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">고객</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">상태</TableHead>
              <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">마감기한</TableHead>
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
                        <Badge variant="outline" className="text-[9px] font-black h-4 px-1.5 rounded-md border-zinc-100 bg-white shadow-sm">
                          {ticket.category === CAT_EMERGENCY ? "🚨 " : 
                           ticket.category === CAT_ERROR ? "🛠️ " :
                           ticket.category === CAT_REPAIR ? "🎨 " :
                           ticket.category === CAT_REQUEST ? "📂 " :
                           ticket.category === CAT_ADD ? "➕ " : ""}
                          {ticket.category.includes('/') ? ticket.category.split('/')[1].trim() : ticket.category}
                        </Badge>
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
    </PageContainer>
  )
}
