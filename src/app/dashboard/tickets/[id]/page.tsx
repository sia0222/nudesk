'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useRef } from 'react'
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"
import { Briefcase, Clock, Calendar as CalendarIcon, User, Building2, FileText, Send, Paperclip, X, Check, Loader2, Zap, ArrowLeft, Quote, Bookmark, Star, Mail, CheckCircle2 } from 'lucide-react'
import { useTicket, useAddComment, useAssignStaffAndAccept, useProjectStaffs, useStartWork, useUpdateTicketStatus } from "@/hooks/use-tickets"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, startOfDay, isWeekend } from "date-fns"
import { ko } from "date-fns/locale"
import { getCurrentSession } from "@/lib/authHelpers"
import { createClient } from "@/utils/supabase/client"
import { isBusinessDay, HOLIDAYS_2026, getBusinessDate } from "@/lib/date-utils"
import { useQuery } from "@tanstack/react-query"

export default function TicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const session = getCurrentSession()
  const supabase = createClient()
  
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      if (!session) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', session.userId).single()
      return data
    },
    enabled: !!session
  })

  const { data: ticket, isLoading, isError } = useTicket(id as string)
  const { data: projectStaffs } = useProjectStaffs(ticket?.project_id)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 진행률 계산 로직
  const progressInfo = useMemo(() => {
    if (!ticket) return { percentage: 0, label: '0%', color: 'bg-zinc-200' };
    switch (ticket.status) {
      case 'WAITING': return { percentage: 5, label: '5%', color: 'bg-[#F6AD55]' };
      case 'ACCEPTED': return { percentage: 30, label: '30%', color: 'bg-[#82B326]' };
      case 'IN_PROGRESS': return { percentage: 75, label: '75%', color: 'bg-[#3B82F6]' };
      case 'DELAYED': return { percentage: 75, label: '75%', color: 'bg-[#E53E3E]' };
      case 'REQUESTED': return { percentage: 85, label: '85%', color: 'bg-[#242F67]' };
      case 'COMPLETED': return { percentage: 100, label: '100%', color: 'bg-zinc-400' };
      default: return { percentage: 0, label: '0%', color: 'bg-zinc-200' };
    }
  }, [ticket?.status]);

  // 조치 계획 추출 (운영진이 작성한 첫 번째 메시지)
  const startWorkMessage = useMemo(() => {
    if (!ticket?.chats || ticket.chats.length === 0) return null;
    return ticket.chats.find((chat: any) => 
      ['MASTER', 'ADMIN', 'STAFF'].includes(chat.sender?.role)
    );
  }, [ticket?.chats]);

  // 우측 히스토리에서 착수 메시지 제외한 나머지 목록
  const historyMessages = useMemo(() => {
    if (!ticket?.chats) return [];
    if (!startWorkMessage) return ticket.chats;
    return ticket.chats.filter((chat: any) => chat.id !== startWorkMessage.id);
  }, [ticket?.chats, startWorkMessage]);

  // 메시지 추가 또는 상태 변경 시 우측 히스토리 영역만 하단 이동
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [historyMessages, ticket?.status]);

  const dateLimits = useMemo(() => {
    return {
      standardMin: getBusinessDate(3),
      emergencyMin: getBusinessDate(1),
    }
  }, [])
  
  const addCommentMutation = useAddComment()
  const assignStaffMutation = useAssignStaffAndAccept()
  const startWorkMutation = useStartWork()
  const updateStatusMutation = useUpdateTicketStatus()
  
  // ADMIN/STAFF 자동 접수 및 초기 종료일 설정
  useEffect(() => {
    if (ticket && profile && profile.role !== 'CUSTOMER' && ticket.status === 'WAITING') {
      updateStatusMutation.mutate({ ticketId: id as string, status: 'ACCEPTED' })
    }
    // 접수 상태 진입 시 기존 종료일이 있으면 초기값으로 설정
    if (ticket?.status === 'ACCEPTED' && ticket?.end_date && !selectedEndDate) {
      setSelectedEndDate(new Date(ticket.end_date))
    }
  }, [ticket?.status, ticket?.end_date, profile?.role, id])

  const [comment, setComment] = useState('')
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([])
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // 최초 희망 종료일이 오늘이거나 과거인지 확인
  const isInitialDatePassedOrToday = useMemo(() => {
    if (!ticket?.initial_end_date) return false;
    const initialDate = startOfDay(new Date(ticket.initial_end_date));
    const today = startOfDay(new Date());
    return initialDate <= today;
  }, [ticket?.initial_end_date]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() && files.length === 0) return
    
    try {
      setIsUploading(true)
      const uploadedUrls: string[] = []
      
      const supabase = createClient()
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${id}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('tickets')
          .upload(filePath, file)
          
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('tickets')
          .getPublicUrl(filePath)
          
        uploadedUrls.push(publicUrl)
      }
      
       if (ticket?.status === 'ACCEPTED') {
         // 달력에서 선택한 날짜가 있으면 사용, 없으면 최초 희망 종료일을 확정 종료일자로 자동 설정
         const finalEndDate = selectedEndDate 
           ? format(selectedEndDate, 'yyyy-MM-dd') 
           : (ticket.initial_end_date ? format(new Date(ticket.initial_end_date), 'yyyy-MM-dd') : undefined);

         startWorkMutation.mutate({
           ticketId: id as string,
           message: comment,
           file_urls: uploadedUrls,
           staffIds: selectedStaffs,
           endDate: finalEndDate
         }, {
           onSuccess: () => {
             setComment('')
             setFiles([])
             setSelectedStaffs([])
             setSelectedEndDate(undefined)
           }
         })
       } else {
        addCommentMutation.mutate({
          ticketId: id as string,
          message: comment,
          file_urls: uploadedUrls
        }, {
          onSuccess: () => {
            setComment('')
            setFiles([])
          }
        })
      }
    } catch (error: any) {
      alert(`파일 업로드 실패: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleAssignAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStaffs.length === 0) {
      alert('인력을 최소 1명 이상 선택해 주세요.')
      return
    }

    if (!selectedEndDate) {
      alert('종료일자를 선택해 주세요.')
      return
    }

    const minDate = ticket!.is_emergency ? dateLimits.emergencyMin : dateLimits.standardMin
    if (startOfDay(selectedEndDate) < minDate) {
      alert(`${ticket!.is_emergency ? '긴급' : '일반'} 접수는 ${format(minDate, 'yyyy-MM-dd')} 이후부터 가능합니다.`)
      return
    }
    
    assignStaffMutation.mutate({
      ticketId: id as string,
      staffIds: selectedStaffs,
      message: comment,
      endDate: format(selectedEndDate, 'yyyy-MM-dd')
    }, {
      onSuccess: () => {
        setComment('')
        setSelectedStaffs([])
        setSelectedEndDate(undefined)
      }
    })
  }
  
  const toggleStaff = (staffId: string) => {
    setSelectedStaffs(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId) 
        : [...prev, staffId]
    )
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
        </div>
      </PageContainer>
    )
  }

  if (isError || !ticket) {
    return (
      <PageContainer>
        <div className="text-center py-20">
          <h2 className="text-2xl font-black text-zinc-900">티켓을 찾을 수 없습니다.</h2>
          <Button className="mt-4" onClick={() => router.back()}>뒤로 가기</Button>
        </div>
      </PageContainer>
    )
  }

  const statusMap: any = {
    'WAITING': { label: '대기', color: 'border-[#F6AD55] text-[#F6AD55] bg-[#F6AD55]/5' },
    'ACCEPTED': { label: '접수', color: 'border-[#82B326] text-[#82B326] bg-[#82B326]/5' },
    'IN_PROGRESS': { label: '진행', color: 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5' },
    'DELAYED': { label: '지연', color: 'border-[#E53E3E] text-[#E53E3E] bg-[#E53E3E]/5' },
    'REQUESTED': { label: '요청', color: 'border-[#242F67] text-[#242F67] bg-[#242F67]/5' },
    'COMPLETED': { label: '완료', color: 'border-[#9CA3AF] text-[#9CA3AF] bg-[#9CA3AF]/5' },
  }

  const roleColorMap: any = {
    'MASTER': 'text-[#242F67]',
    'ADMIN': 'text-[#82B326]',
    'STAFF': 'text-[#F6AD55]',
    'CUSTOMER': 'text-[#D98ADA]',
  }

  const roleBgMap: any = {
    'MASTER': 'bg-[#242F67] text-white',
    'ADMIN': 'bg-[#82B326] text-white',
    'STAFF': 'bg-[#F6AD55] text-white',
    'CUSTOMER': 'bg-[#D98ADA] text-white',
  }

  // 우측 영역 표시 여부 결정
  const showRightArea = !(profile?.role === 'CUSTOMER' && (ticket.status === 'WAITING' || ticket.status === 'ACCEPTED'))

  return (
    <PageContainer>
      <PageHeader
        title="업무 상세"
        description="접수된 업무의 상세 내용과 진행 상황을 확인합니다."
        leftElement={
          <Button 
            className="h-16 w-16 rounded-3xl bg-zinc-900 text-white shadow-xl shadow-zinc-100 transition-transform hover:scale-105 hover:bg-zinc-900 duration-300 p-0" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="!h-7 !w-7" strokeWidth={3} />
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* 정보 영역 (좌측) */}
        <div className={cn(
          "space-y-6 transition-all duration-500",
          !showRightArea ? "lg:col-span-12 max-w-5xl mx-auto" : "lg:col-span-7"
        )}>
          {/* 1. 진행률 섹션 */}
          <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden bg-white">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest">현재 진행 상황</p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tighter">{progressInfo.percentage}%</h2>
                    <span className="text-2xl font-black text-zinc-200 tracking-tighter">/</span>
                    <span className="text-2xl font-black text-[#3B82F6] tracking-tighter">
                      {statusMap[ticket.status].label}
                    </span>
                  </div>
                </div>
                {(profile?.role === 'ADMIN' || profile?.role === 'STAFF') && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10 px-6 rounded-xl border-zinc-200 font-black text-xs text-zinc-600 hover:bg-zinc-50 transition-all">
                      연기 요청
                    </Button>
                    <Button className="h-10 px-6 rounded-xl bg-zinc-900 text-white font-black text-xs hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-100">
                      완료 요청
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="relative h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("absolute left-0 top-0 h-full transition-all duration-1000 ease-out", progressInfo.color)}
                    style={{ width: `${progressInfo.percentage}%` }}
                  />
                  <div className="absolute inset-0 flex justify-evenly pointer-events-none">
                    <div className="h-full w-px bg-white/50" />
                    <div className="h-full w-px bg-white/50" />
                    <div className="h-full w-px bg-white/50" />
                  </div>
                </div>
                <div className="flex justify-between px-1">
                  {['대기', '접수', '진행', '완료'].map((step, i) => (
                    <span key={i} className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. 업무 내용 및 착수 메시지 (동일 중요도 구성) */}
          <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              {/* 본문 영역 */}
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-500">{ticket.requester?.customer?.company_name || '---'}</span>
                    <span className="text-xs font-black text-zinc-300">|</span>
                    <span className="text-xs font-bold text-zinc-400">
                      {format(new Date(ticket.created_at), 'yyyy.MM.dd HH:mm')}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tighter leading-tight">
                    {ticket.title}
                  </h1>
                  <div className="min-h-[200px] text-zinc-900 font-black text-lg leading-relaxed whitespace-pre-wrap">
                    {ticket.description || '상세 내용이 없습니다.'}
                  </div>
                </div>

                {/* 첨부 파일 (파일이 있는 경우에만 목록 노출) */}
                {ticket.file_urls && ticket.file_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ticket.file_urls.map((url: string, i: number) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-100 transition-all group"
                      >
                        <FileText className="h-4 w-4 text-[#9CA3AF] group-hover:text-zinc-900" />
                        <span className="text-xs font-black text-zinc-600 group-hover:text-zinc-900">첨부파일 {i + 1}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* 조치 계획 (업무 본문과 동일 위계 구성) */}
              {startWorkMessage && (
                <div className="bg-white border-t border-zinc-100 p-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-500">{startWorkMessage.sender?.full_name}</span>
                      <span className="text-xs font-black text-zinc-300">|</span>
                      <span className="text-xs font-bold text-zinc-400">
                        {format(new Date(startWorkMessage.created_at), 'yyyy.MM.dd HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-[150px] text-zinc-900 font-black text-lg leading-relaxed whitespace-pre-wrap">
                    {startWorkMessage.message}
                  </div>

                  {/* 조치 관련 첨부 파일 (파일이 있는 경우에만 목록 노출) */}
                  {startWorkMessage.file_urls && startWorkMessage.file_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-6 border-t border-zinc-50">
                      {startWorkMessage.file_urls.map((url: string, idx: number) => (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-100 transition-all group"
                        >
                          <Paperclip className="h-4 w-4 text-[#9CA3AF] group-hover:text-zinc-900" />
                          <span className="text-xs font-black text-zinc-600 group-hover:text-zinc-900">파일 {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. 부가 정보 (2x2 통합 그리드) */}
          <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[1.5rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* 프로젝트 */}
                <div className="p-5 flex items-center gap-4 border-b border-r border-zinc-50">
                  <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="h-4.5 w-4.5 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">프로젝트</p>
                    <p className="text-sm font-black text-zinc-900 leading-tight">
                      {ticket.project?.name || '---'}
                    </p>
                  </div>
                </div>

                {/* 요청자 정보 */}
                <div className="p-5 flex items-center gap-4 border-b border-zinc-50">
                  <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                    <User className="h-4.5 w-4.5 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">요청자 정보</p>
                    <p className="text-sm font-black text-zinc-900 leading-tight">
                      {ticket.requester?.full_name || '---'}
                    </p>
                  </div>
                </div>

                {/* 최초 희망 종료일 */}
                <div className="p-5 flex items-center gap-4 border-r border-zinc-50 md:border-b-0 border-b">
                  <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-4.5 w-4.5 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">최초 희망 종료일</p>
                    <p className="text-sm font-black text-zinc-900 tracking-tight">
                      {ticket.initial_end_date ? format(new Date(ticket.initial_end_date), 'yyyy.MM.dd') : '---'}
                    </p>
                  </div>
                </div>

                {/* 최종 확정 종료일자 */}
                <div className="p-5 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">최종 확정 종료일자</p>
                    <p className="text-sm font-black text-zinc-900 tracking-tight">
                      {ticket.confirmed_end_date ? format(new Date(ticket.confirmed_end_date), 'yyyy.MM.dd') : '---'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 긴급 처리 사유 (있는 경우에만 얇게 한 줄 추가) */}
              {ticket.is_emergency && (
                <div className="bg-red-50/10 p-4 flex items-center gap-4 border-t border-red-50">
                  <div className="flex-shrink-0 ml-1">
                    <Zap className="h-3.5 w-3.5 fill-red-600 text-red-600 animate-pulse" />
                  </div>
                  <div className="flex gap-3 items-center">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">긴급 사유</p>
                    <p className="text-xs font-bold text-zinc-900">"{ticket.emergency_reason || '사유 미작성'}"</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 댓글 영역 (우측) */}
        {showRightArea && (
          <div className="lg:col-span-5 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 sticky top-24 h-[calc(100vh-300px)]">
            <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden bg-white flex flex-col h-full gap-0">
              {/* 1. 내용: 남은 높이 차지 및 스크롤 */}
              <ScrollArea className="flex-1 min-h-0">
                <div ref={scrollRef} className="p-8 space-y-8">
                  {/* 진행 히스토리: ACCEPTED 상태가 아닐 때만 표시 */}
                  {ticket.status !== 'ACCEPTED' && historyMessages && historyMessages.length > 0 ? (
                    historyMessages.map((chat: any) => {
                      const isMyChat = chat.sender?.id === session?.userId;
                      return (
                        <div key={chat.id} className={cn(
                          "flex flex-col gap-2 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                          isMyChat ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                          <div className={cn("flex items-center gap-2 mb-1", isMyChat ? "flex-row-reverse" : "flex-row")}>
                            <span className={cn(
                              "text-xs font-black uppercase tracking-widest",
                              roleColorMap[chat.sender?.role] || "text-zinc-500"
                            )}>
                              {chat.sender?.role}
                            </span>
                            <span className="text-xs font-black text-zinc-900">{chat.sender?.full_name}</span>
                            <span className="text-xs font-bold text-[#9CA3AF] opacity-60">
                              {format(new Date(chat.created_at), 'MM.dd HH:mm')}
                            </span>
                          </div>

                          {chat.message && (
                            <div className={cn(
                              "p-4 rounded-[1.5rem] text-sm font-black whitespace-pre-wrap shadow-sm border transition-all",
                              isMyChat 
                                ? "bg-zinc-900 text-white border-zinc-900 rounded-tr-none" 
                                : "bg-white text-zinc-700 border-zinc-100 rounded-tl-none"
                            )}>
                              {chat.message}
                            </div>
                          )}

                          {chat.file_urls && chat.file_urls.length > 0 && (
                            <div className={cn("flex flex-wrap gap-2 mt-1", isMyChat ? "justify-end" : "justify-start")}>
                              {chat.file_urls.map((url: string, idx: number) => (
                                <a 
                                  key={idx} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border shadow-sm group",
                                    isMyChat 
                                      ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700" 
                                      : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                                  )}
                                >
                                  <Paperclip className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                                  파일 {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : ticket.status !== 'ACCEPTED' && (
                    <div className="text-center py-20">
                      <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-8 w-8 text-zinc-200" />
                      </div>
                      <p className="text-sm font-black text-[#9CA3AF]">대화 내용이 없습니다.</p>
                    </div>
                  )}

                   {/* ACCEPTED 상태일 때 안내 메시지 및 인력 배치 폼 */}
                   {ticket.status === 'ACCEPTED' && (
                     <div className="space-y-8">
                       {/* 안내 메시지 */}
                       <div className="bg-zinc-50/50 p-6 rounded-[2rem] border border-zinc-100 text-center">
                         <p className="text-sm font-black text-[#9CA3AF] leading-relaxed">
                           업무가 접수되었습니다. <br/>
                           조치 계획을 작성해 주세요.
                         </p>
                       </div>

                       {/* 종료일 변경: 최초 희망일이 오늘보다 미래일 때만 표시 */}
                       {!isInitialDatePassedOrToday && (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between ml-1">
                             <label className="text-sm font-black text-zinc-700">종료일 확인 및 변경</label>
                           <span className={cn("text-xs font-black", ticket.is_emergency ? "text-red-600" : "text-blue-600")}>
                             {ticket.is_emergency ? "긴급: 1영업일 이후부터" : "일반: 3영업일 이후부터"}
                           </span>
                           </div>
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button
                                 variant={"outline"}
                                 className={cn(
                                   "w-full h-14 justify-start text-left font-black rounded-2xl border-zinc-200 hover:bg-zinc-50 transition-all",
                                   !selectedEndDate && "text-[#9CA3AF]",
                                   ticket.is_emergency && "border-red-200 bg-red-50/10"
                                 )}
                               >
                                 <CalendarIcon className="mr-3 h-4 w-4" />
                                 {selectedEndDate ? format(selectedEndDate, "yyyy.MM.dd", { locale: ko }) : "날짜를 선택하세요"}
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0 rounded-[1.5rem] border-none shadow-2xl" align="start">
                               <Calendar
                                 mode="single"
                                 selected={selectedEndDate}
                                 onSelect={setSelectedEndDate}
                                 initialFocus
                                 disabled={(date) => {
                                   const d = startOfDay(date);
                                   const t = startOfDay(new Date());
                                   if (d < t) return true;
                                   const minDate = ticket.is_emergency ? dateLimits.emergencyMin : dateLimits.standardMin;
                                   if (d < minDate) return true;
                                   if (isWeekend(d)) return true;
                                   const dateStr = format(d, 'yyyy-MM-dd');
                                   return HOLIDAYS_2026.includes(dateStr);
                                 }}
                                 locale={ko}
                               />
                             </PopoverContent>
                           </Popover>
                         </div>
                       )}

                       {/* 인력 배치 폼 */}
                      {(!ticket.assignees || ticket.assignees.length === 0) && (
                        <div className="space-y-3">
                          <label className="text-sm font-black text-zinc-700 ml-1">내부 인력 배치</label>
                          <div className="grid grid-cols-1 gap-2">
                            {projectStaffs?.map((staff: any) => (
                              <div 
                                key={staff.id}
                                onClick={() => toggleStaff(staff.id)}
                                className={cn(
                                  "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                                  selectedStaffs.includes(staff.id) 
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" 
                                    : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                                )}
                              >
                                <div className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black",
                                  selectedStaffs.includes(staff.id) ? "bg-zinc-800" : "bg-zinc-100 text-[#9CA3AF]"
                                )}>
                                  {staff.role[0]}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-black">{staff.full_name}</p>
                                  <p className={cn("text-xs font-black opacity-60", selectedStaffs.includes(staff.id) ? "text-white" : "text-[#9CA3AF]")}>{staff.role}</p>
                                </div>
                                {selectedStaffs.includes(staff.id) && <Check className="h-4 w-4" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* 3. 댓글 입력창: 고정 */}
              {ticket.status !== 'COMPLETED' && (
                <div className="p-8 border-t bg-zinc-50/50 flex-none">
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-1">
                          <FileText className="h-3 w-3 text-[#9CA3AF]" />
                          <span className="text-xs font-black text-zinc-600 truncate max-w-[150px]">{file.name}</span>
                          <button type="button" onClick={() => removeFile(index)} className="text-zinc-300 hover:text-red-500 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                   <form onSubmit={handleAddComment} className="space-y-4">
                     <div className="relative bg-white rounded-[1.5rem] border border-zinc-200 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                       <Textarea 
                         placeholder={ticket.status === 'ACCEPTED' ? "조치 계획을 입력하세요..." : "댓글을 입력하세요..."}
                         className="min-h-[100px] border-none shadow-none focus-visible:ring-0 p-5 font-black text-sm"
                         value={comment}
                         onChange={(e) => setComment(e.target.value)}
                       />
                      <div className="flex items-center justify-between px-5 pb-4">
                        <div className="relative">
                          <input
                            type="file"
                            id="comment-file"
                            className="hidden"
                            multiple
                            onChange={handleFileChange}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full text-[#9CA3AF] hover:text-zinc-900"
                            onClick={() => document.getElementById('comment-file')?.click()}
                          >
                            <Paperclip className="h-5 w-5" />
                          </Button>
                        </div>
                        <Button 
                          type="submit" 
                          disabled={(!comment.trim() && files.length === 0) || addCommentMutation.isPending || startWorkMutation.isPending || isUploading}
                          className="h-10 px-6 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-black flex items-center gap-2 transition-all active:scale-95"
                        >
                          {addCommentMutation.isPending || startWorkMutation.isPending || isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : ticket.status === 'ACCEPTED' ? (
                            <>전송 및 업무 시작 <Check className="h-4 w-4" /></>
                          ) : (
                            <>전송 <Send className="h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
