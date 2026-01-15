'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"
import { Briefcase, Clock, Calendar as CalendarIcon, User, Building2, FileText, Send, Paperclip, X, Check, Loader2, Zap, ArrowLeft } from 'lucide-react'
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
        if (!selectedEndDate) {
          alert('종료일자를 선택해 주세요.')
          return
        }

        const minDate = ticket.is_emergency ? dateLimits.emergencyMin : dateLimits.standardMin
        if (startOfDay(selectedEndDate) < minDate) {
          alert(`${ticket.is_emergency ? '긴급' : '일반'} 업무는 ${format(minDate, 'yyyy-MM-dd')} 이후부터 가능합니다.`)
          return
        }

        startWorkMutation.mutate({
          ticketId: id as string,
          message: comment,
          file_urls: uploadedUrls,
          staffIds: selectedStaffs,
          endDate: format(selectedEndDate, 'yyyy-MM-dd')
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
    'IN_PROGRESS': { label: '진행', color: 'border-[#82B326] text-[#82B326] bg-[#82B326]/5' },
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
            className="h-16 w-16 rounded-3xl bg-zinc-900 text-white shadow-xl shadow-zinc-100 transition-transform hover:scale-105 duration-300 p-0" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-9 w-9" strokeWidth={3} />
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* 정보 영역 (좌측) */}
        <div className={cn(
          "space-y-6 transition-all duration-500",
          !showRightArea ? "lg:col-span-12 max-w-4xl mx-auto" : "lg:col-span-7"
        )}>
          <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
            <CardContent className="p-10 space-y-10">
              {/* 1. 상태 및 확정 일정 섹션 (가장 중요) */}
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest ml-1">현재 상태</p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("px-6 py-2 rounded-full font-black text-sm border-2 shadow-sm", statusMap[ticket.status].color)}>
                      {statusMap[ticket.status].label}
                    </Badge>
                    {ticket.is_emergency && (
                      <Badge variant="destructive" className="px-6 py-2 rounded-full font-black text-sm bg-red-600 border-none animate-pulse">
                        URGENT
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-3 text-right">
                  <p className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest mr-1">확정 종료일자</p>
                  <p className="text-3xl font-black text-zinc-900 italic tracking-tighter">
                    {ticket.confirmed_end_date 
                      ? format(new Date(ticket.confirmed_end_date), 'yyyy.MM.dd') 
                      : '---'}
                  </p>
                </div>
              </div>

              {/* 2. 업무 내용 섹션 (제목, 내용, 첨부파일) */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tighter leading-tight">
                    {ticket.title}
                  </h1>
                  <div className="min-h-[300px] text-zinc-900 font-black text-xl leading-relaxed whitespace-pre-wrap bg-zinc-50/30 p-8 rounded-[2rem] border border-dashed border-zinc-200">
                    {ticket.description || '상세 내용이 없습니다.'}
                  </div>
                </div>

                {/* 긴급 처리 사유 (있을 경우 내용 하단에 배치) */}
                {ticket.is_emergency && (
                  <div className="bg-red-50/50 p-8 rounded-[2rem] border border-red-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-red-600 fill-red-600 animate-pulse" />
                      <span className="text-sm font-black text-red-600 uppercase tracking-widest">긴급 처리 사유</span>
                    </div>
                    <p className="text-lg font-black text-zinc-900 leading-relaxed">
                      {ticket.emergency_reason || '사유가 작성되지 않았습니다.'}
                    </p>
                  </div>
                )}

                {/* 첨부 파일 */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-[#9CA3AF]">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">첨부 파일 ({ticket.file_urls?.length || 0})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ticket.file_urls && ticket.file_urls.length > 0 ? (
                      ticket.file_urls.map((url: string, i: number) => (
                        <a 
                          key={i} 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-3 px-5 py-4 bg-white hover:bg-zinc-50 rounded-2xl border border-zinc-200 transition-all group shadow-sm"
                        >
                          <FileText className="h-5 w-5 text-[#9CA3AF] group-hover:text-zinc-900" />
                          <span className="text-sm font-black text-zinc-600 group-hover:text-zinc-900">첨부파일 {i + 1}</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm font-black text-[#9CA3AF] italic ml-1">첨부된 파일이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-zinc-100" />

              {/* 3. 상세 정보 섹션 (상대적으로 덜 중요한 정보) */}
              <div className="grid grid-cols-3 gap-8 px-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">프로젝트 및 고객사</p>
                  <p className="text-sm font-black text-zinc-600">{ticket.project?.name || '---'}</p>
                  <p className="text-xs font-bold text-[#9CA3AF]">{ticket.requester?.customer?.company_name || '---'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">요청자 정보</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                      roleBgMap[ticket.requester?.role] || "bg-zinc-100 text-zinc-400"
                    )}>
                      {ticket.requester?.full_name?.[0]}
                    </div>
                    <p className="text-sm font-black text-zinc-600">{ticket.requester?.full_name || '---'}</p>
                  </div>
                  <p className="text-[10px] font-bold text-[#9CA3AF]">등록일: {format(new Date(ticket.created_at), 'yyyy.MM.dd')}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">최초 희망 종료일</p>
                  <p className="text-sm font-black text-zinc-600 italic">
                    {ticket.initial_end_date 
                      ? format(new Date(ticket.initial_end_date), 'yyyy.MM.dd') 
                      : '---'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 댓글 영역 (우측) */}
        {showRightArea && (
          <div className="lg:col-span-5 flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white flex flex-col h-[calc(100vh-280px)]">
              <div className="p-8 border-b bg-zinc-50/30">
                <h3 className="text-xl font-black text-zinc-900 tracking-tighter italic">
                  {ticket.status === 'ACCEPTED' ? '업무 시작 메시지 작성' : '진행 히스토리'}
                </h3>
              </div>
              
              <ScrollArea className="flex-1 p-8">
                <div className="space-y-8">
                  {/* 진행 히스토리: ACCEPTED 상태가 아닐 때만 표시 */}
                  {ticket.status !== 'ACCEPTED' && ticket.chats && ticket.chats.length > 0 ? (
                    ticket.chats.map((chat: any) => (
                      <div key={chat.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-black",
                              roleColorMap[chat.sender?.role] || "text-zinc-500"
                            )}>
                              {chat.sender?.role}
                            </span>
                            <span className="text-sm font-black text-zinc-900">{chat.sender?.full_name}</span>
                          </div>
                        <span className="text-[10px] font-black text-[#9CA3AF]">{format(new Date(chat.created_at), 'yyyy.MM.dd HH:mm')}</span>
                      </div>
                      {chat.message && (
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 text-sm font-black text-zinc-700 whitespace-pre-wrap">
                          {chat.message}
                        </div>
                      )}
                      {chat.file_urls && chat.file_urls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {chat.file_urls.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-100 rounded-lg text-[10px] font-black text-[#9CA3AF] hover:text-zinc-900">
                                <Paperclip className="h-3 w-3" />
                                파일 {idx + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : ticket.status !== 'ACCEPTED' && (
                    <div className="text-center py-10">
                      <p className="text-sm font-black text-[#9CA3AF] italic">히스토리가 없습니다.</p>
                    </div>
                  )}

                  {/* ACCEPTED 상태일 때 안내 메시지 및 인력 배치 폼 */}
                  {ticket.status === 'ACCEPTED' && (
                    <div className="space-y-8">
                      <div className="bg-zinc-50/50 p-6 rounded-[2rem] border border-zinc-100">
                        <p className="text-sm font-black text-[#9CA3AF] leading-relaxed">
                          업무가 접수되었습니다. <br/>
                          실무 시작을 위한 메시지를 작성해 주세요. <br/>
                          메시지를 전송하면 상태가 <span className="text-[#82B326]">진행</span>으로 변경됩니다.
                        </p>
                      </div>

                      {/* 종료일 변경 (고객 접수 건인 경우 운영자가 조정 가능) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-sm font-black text-zinc-700">종료일 확인 및 변경</label>
                          <span className={cn("text-[10px] font-black italic", ticket.is_emergency ? "text-red-600" : "text-blue-600")}>
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

                      {/* 인력이 배정되지 않은 경우에만 인력 배치 폼 표시 (고객이 접수한 건을 관리자가 처음 열었을 때) */}
                      {(!ticket.assignees || ticket.assignees.length === 0) && (
                        <div className="space-y-6">
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
                                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic",
                                    selectedStaffs.includes(staff.id) ? "bg-zinc-800" : "bg-zinc-100 text-[#9CA3AF]"
                                  )}>
                                    {staff.role[0]}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-black">{staff.full_name}</p>
                                    <p className={cn("text-[10px] font-black opacity-60", selectedStaffs.includes(staff.id) ? "text-white" : "text-[#9CA3AF]")}>{staff.role}</p>
                                  </div>
                                  {selectedStaffs.includes(staff.id) && <Check className="h-4 w-4" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* 댓글 작성 영역 (상태에 따라 다름) */}
              {ticket.status !== 'COMPLETED' && (
                <div className="p-8 border-t bg-zinc-50/50">
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
                        placeholder={ticket.status === 'ACCEPTED' ? "실무 착수 메시지를 입력하세요..." : "댓글을 입력하세요..."}
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
