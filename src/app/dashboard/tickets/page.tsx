'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, Loader2, AlertCircle, Plus, Briefcase, ChevronRight, Paperclip, Check, X, FileText, Calendar as CalendarIcon, Clock, ClipboardCheck, PlayCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
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
import { format, startOfDay, isWeekend, differenceInDays } from "date-fns"
import { ko } from "date-fns/locale"
import { getBusinessDate, isBusinessDay, HOLIDAYS_2026 } from "@/lib/date-utils"

export default function TicketsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false) // 달력 팝오버 상태 추가

  const [formData, setFormData] = useState({
    project_id: '',
    receipt_type: '온라인' as '온라인' | '전화' | '팩스' | '이메일',
    title: '',
    description: '',
    assigned_to_ids: [] as string[],
    end_date: undefined as Date | undefined,
    is_emergency: false,
    emergency_reason: '',
    files: [] as File[] 
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 입력값이 변경될 때 에러 메시지 제거
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

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
    queryKey: ['my-projects', session?.userId, profile?.role, profile?.customer_id],
    queryFn: async () => {
      if (!session || !profile) return []
      
      // 고객(CUSTOMER) 권한인 경우: 본인 회사(customer_id)에 할당된 활성 프로젝트만 조회
      if (profile.role === 'CUSTOMER' && profile.customer_id) {
        // 소속된 고객사의 활성화 여부 확인
        const { data: customer } = await supabase
          .from('customers')
          .select('is_active')
          .eq('id', profile.customer_id)
          .single()
        
        // 고객사가 비활성화된 경우 프로젝트 조회 안됨
        if (!customer?.is_active) return []

        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('customer_id', profile.customer_id)
          .eq('is_active', true)
          .order('name', { ascending: true })
        return projects || []
      } 
      
      // ADMIN, STAFF 권한인 경우: 참여 중인(project_members) 활성 고객사의 활성 프로젝트만 조회
      const { data: memberships } = await supabase
        .from('project_members')
        .select(`
          project_id,
          project:project_id(
            id,
            is_active,
            customer:customer_id(is_active)
          )
        `)
        .eq('user_id', session.userId)
      
      if (!memberships || memberships.length === 0) return []
      
      // 프로젝트가 활성 상태이고, (고객사가 없거나 활성 고객사인 경우)에만 포함
      const projectIds = memberships
        .filter((m: any) => m.project?.is_active && (!m.project?.customer || m.project?.customer?.is_active))
        .map((m: any) => m.project_id)

      if (projectIds.length === 0) return []

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('name', { ascending: true })
      return projects || []
    },
    enabled: !!session && !!profile
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

  // 소속 프로젝트가 1개일 때 자동 지정 로직
  useEffect(() => {
    if (myProjects && myProjects.length === 1 && !formData.project_id) {
      setFormData(prev => ({ ...prev, project_id: myProjects[0].id }));
    }
  }, [myProjects, formData.project_id]);

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
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...Array.from(selectedFiles)]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const [isUploading, setIsUploading] = useState(false)

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {};

    if (!formData.project_id) {
      newErrors.project_id = '프로젝트를 선택해주세요.';
    }
    if (!formData.title.trim()) {
      newErrors.title = '업무 제목을 입력해주세요.';
    }
    
    // ADMIN, STAFF일 때만 내부 인력 배치 필수 검사
    if (profile?.role !== 'CUSTOMER' && formData.assigned_to_ids.length === 0) {
      newErrors.assigned_to_ids = '내부 인력을 최소 1명 이상 배치해주세요.';
    }

    if (!formData.end_date) {
      newErrors.end_date = '종료 일자를 선택해주세요.';
    } else {
      const minDate = formData.is_emergency ? dateLimits.emergencyMin : dateLimits.standardMin
      const d = startOfDay(formData.end_date);
      if (d < minDate) {
        newErrors.end_date = `${formData.is_emergency ? '긴급' : '일반'} 접수는 ${format(minDate, 'yyyy-MM-dd')} 이후부터 가능합니다.`;
      } else if (!isBusinessDay(d)) {
        newErrors.end_date = '주말이나 공휴일은 선택할 수 없습니다.';
      }
    }

    if (formData.is_emergency && !formData.emergency_reason.trim()) {
      newErrors.emergency_reason = '긴급 처리 사유를 입력해주세요.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('입력 항목을 확인해주세요.');
      return;
    }

    try {
      setIsUploading(true)
      const uploadedUrls: string[] = []
      
      for (const file of formData.files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `new-tickets/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('tickets')
          .upload(filePath, file)
          
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('tickets')
          .getPublicUrl(filePath)
          
        uploadedUrls.push(publicUrl)
      }

      const submissionData = {
        ...formData,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        file_urls: uploadedUrls 
      };

      createTicketMutation.mutate(submissionData, {
        onSuccess: () => {
          setIsOpen(false)
          setFormData({
            project_id: '', receipt_type: '온라인', title: '',
            description: '', assigned_to_ids: [], end_date: undefined, is_emergency: false,
            emergency_reason: '', files: []
          })
          setErrors({});
        }
      })
    } catch (error: any) {
      toast.error(`파일 업로드 실패: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader 
        icon={Briefcase} 
        title="접수 리스트" 
        description={profile?.role === 'MASTER' || profile?.role === 'ADMIN' 
          ? '전체 프로젝트의 요청을 실시간으로 관리합니다.' 
          : '소속 프로젝트의 요청 사항을 확인하고 관리합니다.'}
        iconClassName="bg-zinc-900 shadow-zinc-100"
      >
        {profile?.role !== 'MASTER' && (profile?.role !== 'CUSTOMER' || (profile?.customer_id && myProjects && myProjects.length > 0)) && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black gap-2 shadow-xl shadow-zinc-200 transition-all active:scale-95">
                <Plus className="h-5 w-5" />
                {profile?.role === 'CUSTOMER' ? '업무 접수하기' : '새 티켓 등록'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl">
              <div className="p-10 pb-5 flex-none">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tighter">
                    {profile?.role === 'CUSTOMER' ? '업무 접수' : '새 티켓 등록'}
                  </DialogTitle>
                  <DialogDescription className="font-bold text-[#9CA3AF]">
                    상세 정보를 입력하여 업무를 접수해 주세요.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
                <div className="px-10">
                  <form id="ticket-form" onSubmit={handleCreateTicket} className="space-y-8 py-10">
                    <div className="grid grid-cols-2 gap-6">
                      {/* 프로젝트 선택: 고객사이고 프로젝트가 1개인 경우 숨김 */}
                      {!(profile?.role === 'CUSTOMER' && myProjects?.length === 1) && (
                        <div className="grid gap-2 col-span-2">
                          <Label className="text-sm font-black text-zinc-700 ml-1">프로젝트</Label>
                          <Select 
                            onValueChange={(v) => handleInputChange('project_id', v)} 
                            value={formData.project_id}
                            required
                          >
                            <SelectTrigger className={cn(
                              "h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium",
                              errors.project_id && "border-red-500 bg-red-50/30"
                            )}>
                              <SelectValue placeholder="프로젝트를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                              {myProjects?.map(p => <SelectItem key={p.id} value={p.id} className="font-bold py-3">{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {errors.project_id && <p className="text-xs font-bold text-red-500 ml-2 mt-1 italic">! {errors.project_id}</p>}
                        </div>
                      )}

                        {/* 접수 유형: 고객사인 경우 숨김 (자동으로 '온라인' 저장) */}
                        {profile?.role !== 'CUSTOMER' && (
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
                                      : "text-[#9CA3AF] hover:text-zinc-600"
                                  )}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid gap-2 col-span-2">
                          <Label className="text-sm font-black text-zinc-700 ml-1">제목</Label>
                          <Input 
                            placeholder="업무 제목을 입력하세요" 
                            className={cn(
                              "h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium",
                              errors.title && "border-red-500 bg-red-50/30"
                            )}
                            value={formData.title}
                            onChange={e => handleInputChange('title', e.target.value)}
                            required
                          />
                          {errors.title && <p className="text-xs font-bold text-red-500 ml-2 mt-1 italic">! {errors.title}</p>}
                        </div>

                        <div className="grid gap-2 col-span-2">
                          <Label className="text-sm font-black text-zinc-700 ml-1">내용</Label>
                          <Textarea
                            placeholder="상세 내용을 입력하세요"
                            className="min-h-[140px] rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 py-4 font-medium"
                            value={formData.description}
                            onChange={e => handleInputChange('description', e.target.value)}
                          />
                        </div>

                        {/* 내부 인력 배치: 고객사인 경우 숨김 */}
                        {profile?.role !== 'CUSTOMER' && (
                          <div className="grid gap-2 col-span-2">
                                    <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                                      내부 인력 배치
                                      <span className="text-xs text-[#9CA3AF] font-bold uppercase italic">{formData.assigned_to_ids.length}명 선택됨</span>
                                    </Label>
                            <div className={cn(
                              "bg-zinc-50 rounded-[1.5rem] p-4 border transition-all min-h-[120px]",
                              errors.assigned_to_ids ? "border-red-500 bg-red-50/30" : "border-zinc-100"
                            )}>
                              <div className="grid grid-cols-2 gap-3">
                                {projectStaffs?.map((staff: any) => (
                                  <div
                                    key={staff.id}
                                    onClick={() => {
                                      toggleStaff(staff.id);
                                      if (errors.assigned_to_ids) setErrors(prev => {
                                        const next = {...prev};
                                        delete next.assigned_to_ids;
                                        return next;
                                      });
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                      formData.assigned_to_ids.includes(staff.id)
                                        ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                        : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                                    )}
                                  >
                                    <div className={cn(
                                      "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic",
                                      formData.assigned_to_ids.includes(staff.id) ? "bg-zinc-800" : "bg-zinc-100 text-[#9CA3AF]"
                                    )}>
                                      {staff.role[0]}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                      <p className="text-xs font-black truncate">{staff.full_name}</p>
                                      <p className={cn("text-xs font-bold opacity-60", formData.assigned_to_ids.includes(staff.id) ? "text-white" : "text-[#9CA3AF]")}>{staff.role}</p>
                                    </div>
                                    {formData.assigned_to_ids.includes(staff.id) && <Check className="h-4 w-4" />}
                                  </div>
                                ))}
                                {(!projectStaffs || projectStaffs.length === 0) && (
                                  <div className="col-span-2 py-8 text-center text-[#9CA3AF] text-xs font-bold italic">
                                    프로젝트를 먼저 선택해 주세요.
                                  </div>
                                )}
                              </div>
                            </div>
                            {errors.assigned_to_ids && <p className="text-xs font-bold text-red-500 ml-2 mt-1 italic">! {errors.assigned_to_ids}</p>}
                          </div>
                        )}

                        <div className="grid gap-2 col-span-2">
                        <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                          종료 일자
                                  <span className={cn("text-xs font-bold italic", formData.is_emergency ? "text-red-600" : "text-blue-600")}>
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
                                formData.is_emergency && "border-red-200 bg-red-50/10",
                                errors.end_date && "border-red-500 bg-red-50/30 text-red-500"
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
                                handleInputChange('end_date', date);
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
                                {errors.end_date && <p className="text-xs font-bold text-red-500 ml-2 mt-1 italic">! {errors.end_date}</p>}
                      </div>

                      <div className={cn(
                        "grid gap-6 col-span-2 p-6 rounded-[2rem] border transition-all",
                        formData.is_emergency ? "bg-red-50/50 border-red-100 shadow-inner" : "bg-zinc-50 border-zinc-100 opacity-60"
                      )}>
                        <div className="flex items-center justify-between">
                          <Label 
                            className="text-sm font-black text-zinc-700 flex items-center gap-2 cursor-pointer"
                            onClick={() => {
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
                                 className={cn(
                                   "min-h-[80px] rounded-xl border-red-100 focus:ring-red-600 font-medium bg-white",
                                   errors.emergency_reason && "border-red-500 ring-1 ring-red-500"
                                 )}
                                 value={formData.emergency_reason}
                                 onChange={e => handleInputChange('emergency_reason', e.target.value)}
                                 required
                               />
                                       {errors.emergency_reason && <p className="text-xs font-bold text-red-500 ml-2 italic">! {errors.emergency_reason}</p>}
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
                            className="flex items-center justify-center gap-2 w-full h-20 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer font-bold text-[#9CA3AF] hover:text-zinc-900"
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
                                  <FileText className="h-4 w-4 text-[#9CA3AF]" />
                                  <span className="text-xs font-bold text-zinc-600 truncate max-w-[200px]">{file.name}</span>
                                  <span className="text-xs text-[#9CA3AF]">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => removeFile(index)}
                                  className="text-[#9CA3AF] hover:text-red-500 transition-colors"
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
              </div>

            <DialogFooter className="p-10 pt-5 border-t bg-zinc-50/50 flex-none">
              <Button 
                type="submit" 
                form="ticket-form"
                className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
                disabled={createTicketMutation.isPending || isUploading}
              >
                {createTicketMutation.isPending || isUploading ? <Loader2 className="animate-spin h-6 w-6" /> : '접수 완료하기'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        )}
      </PageHeader>

       {/* 통계 섹션 */}
       <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[1.5rem] bg-white overflow-hidden mb-6">
         <CardContent className="p-6">
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             {[
               { label: '대기', status: 'WAITING', color: '#F6AD55', icon: Clock },
               { label: '접수', status: 'ACCEPTED', color: '#82B326', icon: ClipboardCheck },
               { label: '진행', status: 'IN_PROGRESS', color: '#3B82F6', icon: PlayCircle },
               { label: '지연', status: 'DELAYED', color: '#E53E3E', icon: AlertTriangle },
               { label: '완료', status: 'COMPLETED', color: '#9CA3AF', icon: CheckCircle2 },
             ].map((item) => {
               const count = tickets?.filter((t: any) => t.status === item.status).length || 0;
               const Icon = item.icon;
               return (
                 <div key={item.status} className="flex flex-col items-center text-center group">
                   <div 
                     className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
                     style={{ 
                       backgroundColor: `${item.color}08`, // 매우 연한 배경
                       border: `1px solid ${item.color}15` // 아주 옅은 테두리
                     }}
                   >
                     <Icon className="w-5 h-5 transition-transform duration-500 group-hover:rotate-12" style={{ color: item.color }} />
                   </div>
                   <p className="text-lg font-black text-zinc-900 tracking-tighter mb-0.5">{count}건</p>
                   <p className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest leading-none">{item.label}</p>
                 </div>
               );
             })}
           </div>
         </CardContent>
       </Card>

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {tickets && tickets.length > 0 ? (
           tickets.map((ticket: any) => {
             // 지연 로직이 적용된 confirmed_end_date를 우선 사용, 없으면 initial_end_date 사용
             const targetDate = ticket.confirmed_end_date || ticket.initial_end_date;
             const dDay = targetDate ? differenceInDays(new Date(targetDate), startOfDay(new Date())) : null;
             
             return (
              <Card 
                key={ticket.id}
                onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                className="group transition-all border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[1.5rem] cursor-pointer hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] hover:-translate-y-1 bg-white overflow-hidden flex flex-col h-full gap-3"
              >
                 <CardHeader className="px-6 pt-6 pb-0 flex flex-row items-center justify-between space-y-0">
                   <Badge variant="outline" className={cn(
                     "font-black px-3 py-1 rounded-full text-xs border-2 shadow-sm uppercase tracking-widest",
                     ticket.status === 'WAITING' ? "border-[#F6AD55] text-[#F6AD55] bg-[#F6AD55]/5" :
                     ticket.status === 'ACCEPTED' ? "border-[#82B326] text-[#82B326] bg-[#82B326]/5" :
                     ticket.status === 'IN_PROGRESS' ? "border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5" :
                     ticket.status === 'DELAYED' ? "border-[#E53E3E] text-[#E53E3E] bg-[#E53E3E]/5" :
                     ticket.status === 'REQUESTED' ? "border-[#242F67] text-[#242F67] bg-[#242F67]/5" :
                     ticket.status === 'COMPLETED' ? "border-[#9CA3AF] text-[#9CA3AF] bg-[#9CA3AF]/5" :
                     "border-zinc-200 text-[#9CA3AF] bg-zinc-50/50"
                   )}>
                     {ticket.status === 'WAITING' ? '대기' : 
                      ticket.status === 'ACCEPTED' ? '접수' : 
                      ticket.status === 'IN_PROGRESS' ? '진행' : 
                      ticket.status === 'DELAYED' ? '지연' : 
                      ticket.status === 'REQUESTED' ? '요청' : '완료'}
                   </Badge>

                   <div className="flex items-center gap-2">
                     {ticket.status === 'COMPLETED' ? (
                       <span className="text-[#9CA3AF] font-black text-xs uppercase tracking-widest italic">-</span>
                     ) : dDay !== null ? (
                       <span className={cn(
                         "font-black text-sm tracking-tighter italic",
                         dDay <= 0 ? "text-[#E53E3E]" : "text-[#9CA3AF]"
                       )}>
                         {dDay === 0 ? "D-Day" : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`}
                       </span>
                     ) : (
                       <span className="text-[#9CA3AF] font-black text-xs uppercase tracking-widest italic">---</span>
                     )}
                   </div>
                 </CardHeader>
                 
                 <CardContent className="px-6 pt-3 pb-6 flex-1 flex flex-col gap-3">
                   <div className="space-y-1">
                     <p className="text-xs font-black text-[#9CA3AF] uppercase tracking-[0.2em]">{ticket.project?.name || '---'}</p>
                     <div className="flex items-center gap-2">
                       {ticket.is_emergency && <Zap className="h-4 w-4 text-red-600 fill-red-600 animate-pulse flex-shrink-0" />}
                       <h3 className="font-black text-zinc-900 tracking-tight text-base line-clamp-1">
                         {ticket.title}
                       </h3>
                     </div>
                   </div>

                   <p className="text-zinc-500 font-medium text-base leading-relaxed line-clamp-2 min-h-[3rem]">
                     {ticket.description || '내용이 없습니다.'}
                   </p>

                    <div className="mt-auto pt-4 border-t border-zinc-50 grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-widest">최초 희망 종료일</p>
                        <p className="text-xs font-bold text-zinc-900 italic">
                          {ticket.initial_end_date 
                            ? format(new Date(ticket.initial_end_date), "yyyy.MM.dd") 
                            : '---'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-widest">확정 종료일</p>
                        <p className="text-xs font-bold text-zinc-900 italic">
                          {ticket.confirmed_end_date 
                            ? format(new Date(ticket.confirmed_end_date), "yyyy.MM.dd") 
                            : '---'}
                        </p>
                      </div>
                    </div>
                 </CardContent>
               </Card>
             )
           })
         ) : (
           <div className="col-span-full py-32 text-center bg-white rounded-[3rem] shadow-[0_10px_50px_rgba(0,0,0,0.02)] border border-dashed border-zinc-100">
             <div className="flex flex-col items-center justify-center">
               <div className="h-20 w-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                 <Briefcase className="h-10 w-10 text-zinc-200" />
               </div>
               <h3 className="text-xl font-black text-zinc-900 tracking-tighter">조회 가능한 업무가 없습니다</h3>
               <p className="text-[#9CA3AF] text-sm font-bold mt-2">새로운 업무를 접수하거나 담당 프로젝트를 확인해 주세요.</p>
             </div>
           </div>
         )}
       </div>
    </PageContainer>
  )
}
