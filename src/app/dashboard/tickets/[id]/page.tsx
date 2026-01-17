'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect, useRef } from 'react'
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"
import { Briefcase, Clock, Calendar as CalendarIcon, User, Building2, FileText, Send, Paperclip, X, Check, Loader2, Zap, ArrowLeft, Quote, Bookmark, Star, Mail, CheckCircle2 } from 'lucide-react'
import { useTicket, useAddComment, useAssignStaffAndAccept, useProjectStaffs, useStartWork, useUpdateTicketStatus, useRequestDelay, useApproveDelay, useRejectDelay, useRequestCompletion, useApproveCompletion, useRejectCompletion } from "@/hooks/use-tickets"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
  const requestDelayMutation = useRequestDelay()
  const approveDelayMutation = useApproveDelay()
  const rejectDelayMutation = useRejectDelay()
  const requestCompletionMutation = useRequestCompletion()
  const approveCompletionMutation = useApproveCompletion()
  const rejectCompletionMutation = useRejectCompletion()
  
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
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false)
  const [delayRequestDate, setDelayRequestDate] = useState<Date | undefined>(undefined)
  const [delayReason, setDelayReason] = useState('')
  const [acceptanceDelayReason, setAcceptanceDelayReason] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [isRejectingCompletion, setIsRejectingCompletion] = useState(false)
  const [completionRejectionReason, setCompletionRejectionReason] = useState('')
  
  // 희망종료일이 오늘이거나 과거인지 확인
  const isInitialDatePassedOrToday = useMemo(() => {
    if (!ticket?.initial_end_date) return false;
    const initialDate = startOfDay(new Date(ticket.initial_end_date));
    const today = startOfDay(new Date());
    return initialDate <= today;
  }, [ticket?.initial_end_date]);

  // 접수 시 선택한 종료일이 희망종료일보다 늦은지 확인
  const isAcceptanceDelayed = useMemo(() => {
    if (!selectedEndDate || !ticket?.initial_end_date) return false;
    const selectedDate = startOfDay(selectedEndDate);
    const initialDate = startOfDay(new Date(ticket.initial_end_date));
    return selectedDate > initialDate;
  }, [selectedEndDate, ticket?.initial_end_date]);

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
         // 달력에서 선택한 날짜가 있으면 사용, 없으면 희망종료일을 종료예정일로 자동 설정
         const finalEndDate = selectedEndDate 
           ? format(selectedEndDate, 'yyyy-MM-dd') 
           : (ticket.initial_end_date ? format(new Date(ticket.initial_end_date), 'yyyy-MM-dd') : undefined);

         if (isAcceptanceDelayed && !acceptanceDelayReason.trim()) {
           alert('종료일이 희망종료일보다 늦어질 경우, 처리연기 사유를 입력해 주세요.');
           setIsUploading(false);
           return;
         }

         startWorkMutation.mutate({
           ticketId: id as string,
           message: comment,
           file_urls: uploadedUrls,
           staffIds: selectedStaffs,
           endDate: finalEndDate,
           delayReason: isAcceptanceDelayed ? acceptanceDelayReason : undefined
         }, {
           onSuccess: () => {
             setComment('')
             setFiles([])
             setSelectedStaffs([])
             setSelectedEndDate(undefined)
             setAcceptanceDelayReason('')
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

    if (isAcceptanceDelayed && !acceptanceDelayReason.trim()) {
      alert('종료일이 희망종료일보다 늦어질 경우, 처리연기 사유를 입력해 주세요.');
      return;
    }
    
    assignStaffMutation.mutate({
      ticketId: id as string,
      staffIds: selectedStaffs,
      message: comment,
      endDate: format(selectedEndDate, 'yyyy-MM-dd'),
      delayReason: isAcceptanceDelayed ? acceptanceDelayReason : undefined
    }, {
      onSuccess: () => {
        setComment('')
        setSelectedStaffs([])
        setSelectedEndDate(undefined)
        setAcceptanceDelayReason('')
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

  const handleRequestDelay = () => {
    if (!delayRequestDate) {
      alert('연기할 날짜를 선택해 주세요.')
      return
    }
    if (!delayReason.trim()) {
      alert('연기 사유를 입력해 주세요.')
      return
    }
    requestDelayMutation.mutate({
      ticketId: id as string,
      requestedDate: format(delayRequestDate, 'yyyy-MM-dd'),
      reason: delayReason
    }, {
      onSuccess: () => {
        setIsDelayDialogOpen(false)
        setDelayRequestDate(undefined)
        setDelayReason('')
      }
    })
  }

  const handleApproveDelay = () => {
    if (!ticket?.delay_requested_date) return
    approveDelayMutation.mutate({
      ticketId: id as string,
      delayedDate: ticket.delay_requested_date
    })
  }

  const handleRejectDelay = () => {
    if (!rejectionReason.trim()) {
      alert('반려 사유를 입력해 주세요.')
      return
    }
    rejectDelayMutation.mutate({
      ticketId: id as string,
      reason: rejectionReason
    }, {
      onSuccess: () => {
        setIsRejecting(false)
        setRejectionReason('')
      }
    })
  }

  const handleApproveCompletion = () => {
    approveCompletionMutation.mutate({ ticketId: id as string })
  }

  const handleRejectCompletion = () => {
    if (!completionRejectionReason.trim()) {
      alert('반려 사유를 입력해 주세요.')
      return
    }
    rejectCompletionMutation.mutate({
      ticketId: id as string,
      reason: completionRejectionReason
    }, {
      onSuccess: () => {
        setIsRejectingCompletion(false)
        setCompletionRejectionReason('')
      }
    })
  }

  const timelineItems = useMemo(() => {
    if (!ticket?.history) return [];

    const history = ticket.history;
    
    // 완료 요청들 중 가장 최신 것 찾기
    const allReqItems = history.filter((h: any) => h.type === 'COMPLETE_REQUESTED');
    const latestReqItem = allReqItems[allReqItems.length - 1];

    // 1. 핵심 기둥(완료)을 제외한 히스토리 항목
    // 단, '완료요청'은 현재 티켓 상태가 '요청'일 때만 4번째 기둥에서 처리하고, 
    // 그 외의 경우(반려되었거나 이미 완료된 경우)에는 중간 히스토리 포인트로 표시함
    const otherHistory = history.filter((h: any) => {
      if (['COMPLETED', 'COMPLETE_APPROVED'].includes(h.type)) return false;
      // 현재 '요청' 상태이고, 이 항목이 가장 최신 완료 요청인 경우 기둥에서 처리함
      if (h.type === 'COMPLETE_REQUESTED' && ticket.status === 'REQUESTED' && h.id === latestReqItem?.id) return false;
      return true;
    });

    const items: any[] = otherHistory.map((h: any) => {
      let label = h.type;
      let icon = Clock;
      let color = "#9CA3AF";
      
      switch (h.type) {
        case 'WAITING': label = '대기'; icon = Clock; color = "#F6AD55"; break;
        case 'ACCEPTED': label = '접수'; icon = Bookmark; color = "#82B326"; break;
        case 'IN_PROGRESS': label = '진행'; icon = Zap; color = "#3B82F6"; break;
        case 'DELAY_REQUESTED': label = '연기요청'; icon = CalendarIcon; color = "#3B82F6"; break;
        case 'DELAY_APPROVED': label = '연기승인'; icon = Check; color = "#82B326"; break;
        case 'DELAY_REJECTED': label = '연기반려'; icon = X; color = "#E53E3E"; break;
        case 'COMPLETE_REQUESTED': label = '완료요청'; icon = Send; color = "#242F67"; break;
        case 'COMPLETE_REJECTED': label = '완료반려'; icon = X; color = "#E53E3E"; break;
      }
      return { ...h, label, icon, color, isCompleted: true };
    });

    // 2. 누락된 핵심 단계(대기, 접수, 진행)를 미래 단계로 추가
    const historyTypes = otherHistory.map((h: any) => h.type);
    const baseStages = [
      { type: 'WAITING', label: '대기', icon: Clock, color: "#F6AD55" },
      { type: 'ACCEPTED', label: '접수', icon: Bookmark, color: "#82B326" },
      { type: 'IN_PROGRESS', label: '진행', icon: Zap, color: "#3B82F6" }
    ];

    baseStages.forEach(stage => {
      if (!historyTypes.includes(stage.type)) {
        let currentStatusIdx = ['WAITING', 'ACCEPTED', 'IN_PROGRESS', 'DELAYED', 'REQUESTED', 'COMPLETED'].indexOf(ticket.status);
        const stageIdx = ['WAITING', 'ACCEPTED', 'IN_PROGRESS'].indexOf(stage.type);
        
        if (stageIdx > currentStatusIdx) {
          items.push({ ...stage, isCompleted: false, created_at: null, color: "#E2E8F0" });
        }
      }
    });

    // 시간순 정렬 (미래 단계는 뒤로)
    items.sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (a.created_at) return -1;
      if (b.created_at) return 1;
      const order = ['WAITING', 'ACCEPTED', 'IN_PROGRESS'];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    // 3. 마지막 '완료' 기둥 추가 (요청 중이면 완료요청으로, 완료되면 완료로 표시)
    const compItem = history.find((h: any) => h.type === 'COMPLETED' || h.type === 'COMPLETE_APPROVED');
    
    if (compItem) {
      items.push({ type: 'COMPLETED', label: '완료', icon: Star, color: "#9CA3AF", created_at: compItem.created_at, isCompleted: true });
    } else if (latestReqItem && ticket.status === 'REQUESTED') {
      items.push({ type: 'COMPLETED', label: '완료요청', icon: Send, color: "#242F67", created_at: latestReqItem.created_at, isCompleted: true });
    } else {
      items.push({ type: 'COMPLETED', label: '완료', icon: Star, color: "#E2E8F0", created_at: null, isCompleted: false });
    }

    return items;
  }, [ticket?.history, ticket?.status]);

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
    'WAITING': { label: '대기', color: 'border-[#F6AD55] text-[#F6AD55] bg-[#F6AD55]/5', hex: '#F6AD55' },
    'ACCEPTED': { label: '접수', color: 'border-[#82B326] text-[#82B326] bg-[#82B326]/5', hex: '#82B326' },
    'IN_PROGRESS': { label: '진행', color: 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5', hex: '#3B82F6' },
    'DELAYED': { label: '지연', color: 'border-[#E53E3E] text-[#E53E3E] bg-[#E53E3E]/5', hex: '#E53E3E' },
    'REQUESTED': { label: '요청', color: 'border-[#242F67] text-[#242F67] bg-[#242F67]/5', hex: '#242F67' },
    'COMPLETED': { label: '완료', color: 'border-[#9CA3AF] text-[#9CA3AF] bg-[#9CA3AF]/5', hex: '#9CA3AF' },
  }

  const steps = [
    { label: '대기', statuses: ['WAITING'] },
    { label: '접수', statuses: ['ACCEPTED'] },
    { label: '진행', statuses: ['IN_PROGRESS', 'DELAYED', 'REQUESTED'] },
    { label: '완료', statuses: ['COMPLETED'] }
  ];

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
    <>
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

      {/* 연기 요청 알림 (고객용) */}
      {profile?.role === 'CUSTOMER' && ticket.delay_status === 'PENDING' && (
        <Card className="mt-8 border-blue-100 bg-blue-50/20 shadow-[0_8px_30px_rgba(59,130,246,0.05)] rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center md:text-left">
              <div className="h-14 w-14 rounded-2xl bg-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-100">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-zinc-900">업무 연기 승인 요청이 도착했습니다</h3>
                <p className="text-sm font-bold text-zinc-500">
                  기존 종료일: <span className="text-zinc-900 line-through decoration-zinc-300 mr-2">{ticket.confirmed_end_date ? format(new Date(ticket.confirmed_end_date), 'yyyy.MM.dd') : format(new Date(ticket.initial_end_date), 'yyyy.MM.dd')}</span>
                  희망 연기일: <span className="text-[#3B82F6] font-black">{format(new Date(ticket.delay_requested_date), 'yyyy.MM.dd')}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 md:flex-none h-12 px-8 rounded-xl border-zinc-200 font-black text-zinc-600 hover:bg-white hover:text-red-500 hover:border-red-100 transition-all"
                onClick={() => setIsRejecting(true)}
              >
                반려
              </Button>
              <Button 
                className="flex-1 md:flex-none h-12 px-10 rounded-xl bg-[#3B82F6] text-white font-black hover:bg-blue-600 shadow-lg shadow-blue-100 transition-all"
                onClick={handleApproveDelay}
                disabled={approveDelayMutation.isPending}
              >
                {approveDelayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "승인"}
              </Button>
            </div>
          </CardContent>
          {isRejecting && (
            <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
              <div className="p-6 bg-white rounded-2xl border border-blue-50 space-y-4">
                <label className="text-sm font-black text-zinc-900">반려 사유를 작성해 주세요</label>
                <Textarea 
                  placeholder="반려 사유를 입력하세요..." 
                  className="min-h-[100px] rounded-xl border-zinc-100 focus-visible:ring-blue-500 font-bold"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" className="h-10 px-6 rounded-xl font-black text-zinc-400" onClick={() => setIsRejecting(false)}>취소</Button>
                  <Button 
                    className="h-10 px-8 rounded-xl bg-red-500 text-white font-black hover:bg-red-600 shadow-lg shadow-red-100"
                    onClick={handleRejectDelay}
                    disabled={rejectDelayMutation.isPending}
                  >
                    {rejectDelayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "반려 확정"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 완료 요청 알림 (고객용) */}
      {profile?.role === 'CUSTOMER' && ticket.complete_status === 'PENDING' && (
        <Card className="mt-8 border-green-100 bg-green-50/20 shadow-[0_8px_30px_rgba(34,197,94,0.05)] rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center md:text-left">
              <div className="h-14 w-14 rounded-2xl bg-[#82B326] flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-100">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-zinc-900">업무 완료 승인 요청이 도착했습니다</h3>
                <p className="text-sm font-bold text-zinc-500">
                  업무가 완료되었습니다. 최종 결과물을 확인하시고 승인해 주세요.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 md:flex-none h-12 px-8 rounded-xl border-zinc-200 font-black text-zinc-600 hover:bg-white hover:text-red-500 hover:border-red-100 transition-all"
                onClick={() => setIsRejectingCompletion(true)}
              >
                반려
              </Button>
              <Button 
                className="flex-1 md:flex-none h-12 px-10 rounded-xl bg-[#82B326] text-white font-black hover:bg-green-600 shadow-lg shadow-green-100 transition-all"
                onClick={handleApproveCompletion}
                disabled={approveCompletionMutation.isPending}
              >
                {approveCompletionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "완료 승인"}
              </Button>
            </div>
          </CardContent>
          {isRejectingCompletion && (
            <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
              <div className="p-6 bg-white rounded-2xl border border-green-50 space-y-4">
                <label className="text-sm font-black text-zinc-900">반려 사유를 작성해 주세요</label>
                <Textarea 
                  placeholder="반려 사유를 입력하세요..." 
                  className="min-h-[100px] rounded-xl border-zinc-100 focus-visible:ring-green-500 font-bold"
                  value={completionRejectionReason}
                  onChange={(e) => setCompletionRejectionReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" className="h-10 px-6 rounded-xl font-black text-zinc-400" onClick={() => setIsRejectingCompletion(false)}>취소</Button>
                  <Button 
                    className="h-10 px-8 rounded-xl bg-red-500 text-white font-black hover:bg-red-600 shadow-lg shadow-red-100"
                    onClick={handleRejectCompletion}
                    disabled={rejectCompletionMutation.isPending}
                  >
                    {rejectCompletionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "반려 확정"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 1. 타임라인 섹션 - 상단 전체 너비 차지 */}
      <Card className="mt-8 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">업무 타임라인</p>
            {(profile?.role === 'ADMIN' || profile?.role === 'STAFF') && 
             !['WAITING', 'ACCEPTED', 'COMPLETED'].includes(ticket.status) && (
              <div className="flex items-center gap-2">
                {/* 연기 요청 버튼: 아직 한 번도 요청하지 않았고, 현재 완료 요청 중이 아닐 때만 표시 */}
                {ticket.delay_status === null && ticket.status !== 'REQUESTED' && (
                  <Button 
                    variant="outline" 
                    className="h-10 px-6 rounded-xl border-zinc-200 font-black text-xs text-zinc-900 hover:bg-zinc-50 transition-all"
                    onClick={() => {
                      setDelayRequestDate(undefined)
                      setIsDelayDialogOpen(true)
                    }}
                  >
                    연기 요청
                  </Button>
                )}
                {/* 완료 요청 버튼: 현재 완료 요청 중이 아니고, 연기 요청 승인 대기 중도 아닐 때만 표시 */}
                {ticket.status !== 'REQUESTED' && ticket.delay_status !== 'PENDING' && (
                  <Button 
                    className="h-10 px-6 rounded-xl bg-zinc-900 text-white font-black text-xs hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-100"
                    onClick={() => requestCompletionMutation.mutate({ ticketId: id as string })}
                    disabled={requestCompletionMutation.isPending}
                  >
                    {requestCompletionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    완료 요청
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* 타임라인 렌더링 */}
          <div className="relative px-4">
            {/* 배경 선 */}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-zinc-100" />
            
            <div className="relative flex justify-between items-start no-scrollbar min-w-max md:min-w-0">
              {timelineItems.map((item: any, i: number) => {
                const Icon = item.icon;
                const isBaseStep = ['WAITING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(item.type);
                
                return (
                  <div key={i} className="flex flex-col items-center gap-3 z-10 bg-white px-2">
                    <div 
                      className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                        isBaseStep ? "" : "h-8 w-8 rounded-xl opacity-80 mt-1"
                      )}
                      style={{ 
                        backgroundColor: item.color, 
                        boxShadow: isBaseStep ? `0 8px 20px ${item.color}44` : 'none'
                      }}
                    >
                      <Icon className={cn("text-white", isBaseStep ? "h-5 w-5" : "h-4 w-4")} />
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className={cn(
                        "font-black text-zinc-900 whitespace-nowrap",
                        isBaseStep ? "text-[11px]" : "text-[10px] text-zinc-500"
                      )}>
                        {item.label}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 whitespace-nowrap">
                        {item.created_at ? format(new Date(item.created_at), 'MM.dd HH:mm') : '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        {/* 정보 영역 (좌측) */}
        <div className={cn(
          "space-y-6 transition-all duration-500",
          !showRightArea ? "lg:col-span-12" : "lg:col-span-7"
        )}>
          {/* 2. 업무 내용 및 착수 메시지 (동일 중요도 구성) */}
          <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[2rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              {/* 본문 영역 */}
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-500">
                      {ticket.project?.customer?.company_name || ticket.requester?.customer?.company_name || '---'}
                    </span>
                    <span className="text-xs font-black text-zinc-300">|</span>
                    <span className="text-xs font-bold text-zinc-400">
                      {format(new Date(ticket.created_at), 'yyyy.MM.dd HH:mm')}
                    </span>
                  </div>
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
                        <span className="text-xs font-black text-zinc-900 group-hover:text-zinc-900">첨부파일 {i + 1}</span>
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
                          <span className="text-xs font-black text-zinc-900 group-hover:text-zinc-900">파일 {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 긴급 사유 섹션 (별도 구역) */}
          {ticket.is_emergency && (
            <Card className="border border-red-100 bg-red-50/5 shadow-[0_8px_30px_rgba(239,68,68,0.02)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white border border-red-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="h-4.5 w-4.5 text-red-600 fill-red-600 animate-pulse" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex-shrink-0">긴급 사유</span>
                  <div className="h-3 w-px bg-red-200" />
                  <p className="text-base font-bold text-zinc-900 line-clamp-1">
                    "{ticket.emergency_reason || '사유가 작성되지 않았습니다.'}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 처리 연기 사유 섹션 */}
          {ticket.processing_delay_reason && (
            <Card className="border border-amber-100 bg-amber-50/5 shadow-[0_8px_30px_rgba(245,158,11,0.02)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white border border-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CalendarIcon className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex-shrink-0">처리 연기 사유</span>
                  <div className="h-3 w-px bg-amber-200" />
                  <p className="text-base font-bold text-zinc-900">
                    "{ticket.processing_delay_reason}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 연기 요청 사유 섹션 */}
          {ticket.delay_reason && (
            <Card className="border border-blue-100 bg-blue-50/5 shadow-[0_8px_30px_rgba(59,130,246,0.02)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Clock className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex-shrink-0">연기 사유</span>
                  <div className="h-3 w-px bg-blue-200" />
                  <p className="text-base font-bold text-zinc-900">
                    "{ticket.delay_reason}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 연기 요청 반려 사유 섹션 */}
          {ticket.delay_status === 'REJECTED' && ticket.delay_rejection_reason && (
            <Card className="border border-orange-100 bg-orange-50/5 shadow-[0_8px_30px_rgba(249,115,22,0.02)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white border border-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <X className="h-4.5 w-4.5 text-orange-600" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex-shrink-0">연기요청 반려</span>
                  <div className="h-3 w-px bg-orange-200" />
                  <p className="text-base font-bold text-zinc-900">
                    "{ticket.delay_rejection_reason}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 완료 요청 반려 사유 섹션 */}
          {ticket.complete_status === 'REJECTED' && ticket.complete_rejection_reason && (
            <Card className="border border-red-100 bg-red-50/5 shadow-[0_8px_30px_rgba(239,68,68,0.02)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white border border-red-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <X className="h-4.5 w-4.5 text-red-600" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex-shrink-0">완료요청 반려</span>
                  <div className="h-3 w-px bg-red-200" />
                  <p className="text-base font-bold text-zinc-900">
                    "{ticket.complete_rejection_reason}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 완료 요청 반려 사유 섹션 */}
          {ticket.complete_status === 'REJECTED' && ticket.complete_rejection_reason && (
            <Card className="border border-rose-100 bg-rose-50/5 shadow-[0_8px_30px_rgba(225,29,72,0.02)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-white border border-rose-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <X className="h-4.5 w-4.5 text-rose-600" />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex-shrink-0">완료요청 반려</span>
                  <div className="h-3 w-px bg-rose-200" />
                  <p className="text-base font-bold text-zinc-900">
                    "{ticket.complete_rejection_reason}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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

                {/* 희망종료일 */}
                <div className="p-5 flex items-center gap-4 border-r border-zinc-50 md:border-b-0 border-b">
                  <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-4.5 w-4.5 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">희망종료일</p>
                    <p className="text-sm font-black text-zinc-900 tracking-tight">
                      {ticket.initial_end_date ? format(new Date(ticket.initial_end_date), 'yyyy.MM.dd') : '---'}
                    </p>
                  </div>
                </div>

                {/* 종료예정일 */}
                <div className="p-5 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">종료예정일</p>
                    <p className="text-sm font-black text-zinc-900 tracking-tight">
                      {ticket.confirmed_end_date ? format(new Date(ticket.confirmed_end_date), 'yyyy.MM.dd') : '---'}
                    </p>
                  </div>
                </div>
              </div>
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
                              roleColorMap[chat.sender?.role] || "text-zinc-900"
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
                              "p-4 rounded-[1.5rem] text-base font-black whitespace-pre-wrap shadow-sm border transition-all",
                              isMyChat 
                                ? "bg-zinc-900 text-white border-zinc-900 rounded-tr-none" 
                                : "bg-white text-zinc-900 border-zinc-100 rounded-tl-none"
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
                                      : "bg-zinc-50 border-zinc-100 text-zinc-900 hover:text-zinc-900 hover:bg-zinc-100"
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

                       {/* 종료일 변경: 희망종료일이 오늘보다 미래일 때만 표시 */}
                       {!isInitialDatePassedOrToday && (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between ml-1">
                             <label className="text-sm font-black text-zinc-900">종료일 확인 및 변경</label>
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

                       {/* 종료일 연기 시 사유 입력 */}
                       {isAcceptanceDelayed && (
                         <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                           <label className="text-sm font-black text-zinc-900 ml-1">처리연기 사유 (필수)</label>
                           <Textarea 
                             placeholder="종료일이 희망종료일보다 늦어지는 사유를 입력해 주세요..." 
                             className="min-h-[100px] rounded-2xl border-zinc-200 focus-visible:ring-zinc-900 font-bold p-4"
                             value={acceptanceDelayReason}
                             onChange={(e) => setAcceptanceDelayReason(e.target.value)}
                           />
                         </div>
                       )}

                       {/* 인력 배치 폼 */}
                      {(!ticket.assignees || ticket.assignees.length === 0) && (
                        <div className="space-y-3">
                          <label className="text-sm font-black text-zinc-900 ml-1">내부 인력 배치</label>
                          <div className="grid grid-cols-1 gap-2">
                            {projectStaffs?.map((staff: any) => (
                              <div 
                                key={staff.id}
                                onClick={() => toggleStaff(staff.id)}
                                className={cn(
                                  "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                                  selectedStaffs.includes(staff.id) 
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" 
                                    : "bg-white border-zinc-100 text-zinc-900 hover:border-zinc-300"
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
                          <span className="text-xs font-black text-zinc-900 truncate max-w-[150px]">{file.name}</span>
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
    <Dialog open={isDelayDialogOpen} onOpenChange={setIsDelayDialogOpen}>
      <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="text-xl font-black text-zinc-900">업무 연기 요청</DialogTitle>
        </DialogHeader>
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-black text-zinc-900">새로운 종료 희망일</label>
              <span className="text-xs font-black text-blue-600">
                기존: {ticket.confirmed_end_date ? format(new Date(ticket.confirmed_end_date), 'yyyy.MM.dd') : format(new Date(ticket.initial_end_date), 'yyyy.MM.dd')}
              </span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-14 justify-start text-left font-black rounded-2xl border-zinc-200 hover:bg-zinc-50 transition-all",
                    !delayRequestDate && "text-[#9CA3AF]"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4" />
                  {delayRequestDate ? format(delayRequestDate, "yyyy.MM.dd", { locale: ko }) : "날짜를 선택하세요"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-[1.5rem] border-none shadow-2xl" align="start">
                <Calendar
                  mode="single"
                  selected={delayRequestDate}
                  onSelect={(date) => {
                    if (date) {
                      const d = startOfDay(date);
                      const currentTarget = startOfDay(new Date(ticket.confirmed_end_date || ticket.initial_end_date));
                      if (d.getTime() === currentTarget.getTime()) {
                        alert('현재 종료일과 동일한 날짜로는 연기 요청을 할 수 없습니다. 더 이후의 날짜를 선택해 주세요.');
                        return;
                      }
                    }
                    setDelayRequestDate(date);
                  }}
                  initialFocus
                  disabled={(date) => {
                    const d = startOfDay(date);
                    const currentTarget = startOfDay(new Date(ticket.confirmed_end_date || ticket.initial_end_date));
                    // 현재 종료예정일보다 이후 날짜만 선택 가능 (동일한 날짜도 불가)
                    if (d <= currentTarget) return true;
                    if (isWeekend(d)) return true;
                    const dateStr = format(d, 'yyyy-MM-dd');
                    return HOLIDAYS_2026.includes(dateStr);
                  }}
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-black text-zinc-900 ml-1">연기 사유</label>
            <Textarea 
              placeholder="연기 사유를 상세히 입력해 주세요..." 
              className="min-h-[120px] rounded-2xl border-zinc-200 focus-visible:ring-zinc-900 font-bold p-4"
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
            />
          </div>
          <p className="text-xs font-bold text-[#9CA3AF] leading-relaxed bg-zinc-50 p-4 rounded-xl">
            * 연기 요청 시 고객의 승인이 필요합니다.<br/>
            * 승인 전까지는 기존 종료일이 유지됩니다.
          </p>
        </div>
        <DialogFooter className="p-8 pt-0 flex gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-xl border-zinc-200 font-black" onClick={() => setIsDelayDialogOpen(false)}>취소</Button>
          <Button 
            className="flex-1 h-12 rounded-xl bg-zinc-900 text-white font-black hover:bg-zinc-800 shadow-lg shadow-zinc-100"
            onClick={handleRequestDelay}
            disabled={requestDelayMutation.isPending}
          >
            {requestDelayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "연기 요청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
