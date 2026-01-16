'use client'

import { useState, useEffect } from 'react'
import { useProjects, useCreateProject, useUpdateProject, useProjectMembers, useToggleProjectStatus } from '@/hooks/use-projects'
import { useProjectUsers } from '@/hooks/use-admin'
import { useCustomers } from '@/hooks/use-customers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  FolderKanban, 
  Users, 
  Calendar, 
  Loader2, 
  Check, 
  Briefcase,
  LayoutGrid,
  Edit2,
  Search,
  Power,
  PowerOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from '@/utils/supabase/client'
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

// --- 프로젝트 수정 다이얼로그 컴포넌트 ---
function EditProjectDialog({ project, allUsers, customers }: { project: any, allUsers: any[], customers: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    project_type: project.project_type || '개발',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    customer_id: project.customer_id || '',
    memberIds: [] as string[]
  })

  const updateProjectMutation = useUpdateProject()
  const supabase = createClient()

  // 다이얼로그가 열릴 때 현재 멤버 정보를 가져와서 세팅
  useEffect(() => {
    if (isOpen) {
      const fetchMembers = async () => {
        const { data } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', project.id)
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            memberIds: data.map(m => m.user_id)
          }))
        }
      }
      fetchMembers()
    }
  }, [isOpen, project.id, supabase])

  const activeCustomers = customers?.filter((c: any) => c.is_active) || []

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    updateProjectMutation.mutate({
      id: project.id,
      ...formData
    }, {
      onSuccess: () => setIsOpen(false)
    })
  }

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
    }))
  }

  const internalUsers = allUsers?.filter(u => u.role === 'ADMIN' || u.role === 'STAFF') || []
  const customerUsers = allUsers?.filter(u => u.role === 'CUSTOMER') || []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl font-black gap-2 text-[#9CA3AF] hover:bg-zinc-100 hover:text-zinc-900 transition-all">
          <Edit2 className="h-4 w-4" />
          수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl">
        <div className="p-10 pb-5 flex-none">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter">프로젝트 정보 수정</DialogTitle>
            <DialogDescription className="font-bold text-[#9CA3AF]">
              프로젝트 정보를 변경하고 인력을 다시 배치할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
          <div className="px-10">
            <form id="edit-project-form" onSubmit={handleUpdate} className="space-y-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-sm font-black text-zinc-700 ml-1">프로젝트명</Label>
                <Input
                  id="edit-name"
                  placeholder="프로젝트 이름을 입력하세요"
                  className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 text-lg font-bold px-5"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-project_type" className="text-sm font-black text-zinc-700 ml-1">프로젝트 종류</Label>
                  <Select value={formData.project_type} onValueChange={(value: '개발' | '유지') => setFormData({...formData, project_type: value})}>
                    <SelectTrigger className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium">
                      <SelectValue placeholder="종류 선택" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                      <SelectItem value="개발" className="font-bold py-3">개발</SelectItem>
                      <SelectItem value="유지" className="font-bold py-3">유지</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-start_date" className="text-sm font-black text-zinc-700 ml-1">시작일</Label>
                  <Input
                    id="edit-start_date"
                    type="date"
                    className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-end_date" className="text-sm font-black text-zinc-700 ml-1">종료일</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>

              <div className="grid gap-3">
                <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                  고객사 배치 (하나만 선택 가능)
                  <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">
                    {formData.customer_id ? '선택됨' : '미선택'}
                  </span>
                </Label>
                <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                  <ScrollArea className="h-[120px] px-2">
                    <div className="grid grid-cols-2 gap-2 py-2">
                      {activeCustomers.map((customer: any) => (
                        <div
                          key={customer.id}
                          onClick={() => setFormData({...formData, customer_id: formData.customer_id === customer.id ? '' : customer.id})}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                            formData.customer_id === customer.id
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                              : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner",
                            formData.customer_id === customer.id ? "bg-zinc-800 text-white" : "bg-zinc-100 text-[#9CA3AF]"
                          )}>
                            C
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-black truncate">{customer.company_name}</p>
                          </div>
                          {formData.customer_id === customer.id && <Check className="h-4 w-4" />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="grid gap-3 pb-6">
                <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                  내부 인력 재배치
                  <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">
                    {formData.memberIds.filter(id => internalUsers.some(u => u.id === id)).length}명 선택됨
                  </span>
                </Label>
                <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                  <ScrollArea className="h-[140px] px-2">
                    <div className="grid grid-cols-2 gap-2 py-2">
                      {internalUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => toggleMember(user.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                            formData.memberIds.includes(user.id)
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                              : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner",
                            formData.memberIds.includes(user.id) ? "bg-zinc-800 text-white" : "bg-zinc-100 text-[#9CA3AF]"
                          )}>
                            {user.role[0]}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-black truncate">{user.full_name}</p>
                            <p className={cn(
                              "text-xs font-bold truncate opacity-60 uppercase",
                              formData.memberIds.includes(user.id) ? "text-white" : "text-[#9CA3AF]"
                            )}>
                              {user.role}
                            </p>
                          </div>
                          {formData.memberIds.includes(user.id) && <Check className="h-4 w-4" />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="p-10 pt-5 border-t bg-zinc-50/50 flex-none">
          <DialogFooter>
            <Button 
              type="submit" 
              form="edit-project-form"
              className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : '정보 수정 완료 및 인력 재배치'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- 메인 페이지 컴포넌트 ---
export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const { data: allUsers } = useProjectUsers()
  const { data: customers } = useCustomers()
  
  const internalUsers = allUsers?.filter(u => u.role === 'ADMIN' || u.role === 'STAFF') || []
  const customerUsers = allUsers?.filter(u => u.role === 'CUSTOMER') || []

  const createProjectMutation = useCreateProject()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    project_type: '개발' as '개발' | '유지',
    start_date: '',
    end_date: '',
    customer_id: '',
    memberIds: [] as string[]
  })

  const activeCustomers = customers?.filter((c: any) => c.is_active) || []

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    createProjectMutation.mutate({
      ...formData,
      customer_id: formData.customer_id || null
    }, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setFormData({ name: '', project_type: '개발', start_date: '', end_date: '', customer_id: '', memberIds: [] })
      }
    })
  }

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
    }))
  }

  const toggleStatusMutation = useToggleProjectStatus()

  const handleToggleStatus = (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? '비활성화' : '활성화'
    if (confirm(`${name} 프로젝트를 ${action}하시겠습니까?`)) {
      toggleStatusMutation.mutate({ id, is_active: !currentStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader 
        icon={LayoutGrid} 
        title="프로젝트 관리" 
        description="실무 그룹을 생성하고 프로젝트별 인력을 배치합니다."
      >
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black gap-2 shadow-xl shadow-zinc-200 transition-all active:scale-95">
              <Plus className="h-6 w-6" />
              새 프로젝트 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl">
            <div className="p-10 pb-5 flex-none">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tighter">새 프로젝트 생성</DialogTitle>
                <DialogDescription className="font-bold text-[#9CA3AF]">
                  프로젝트의 기본 정보를 입력하고 함께 할 인력을 배치하세요.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
              <div className="px-10">
                <form id="create-project-form" onSubmit={handleCreateProject} className="space-y-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-sm font-black text-zinc-700 ml-1">프로젝트명</Label>
                    <Input
                      id="name"
                      placeholder="프로젝트 이름을 입력하세요"
                      className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 text-lg font-bold px-5"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="project_type" className="text-sm font-black text-zinc-700 ml-1">프로젝트 종류</Label>
                      <Select value={formData.project_type} onValueChange={(value: '개발' | '유지') => setFormData({...formData, project_type: value})}>
                        <SelectTrigger className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium">
                          <SelectValue placeholder="종류 선택" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                          <SelectItem value="개발" className="font-bold py-3">개발</SelectItem>
                          <SelectItem value="유지" className="font-bold py-3">유지</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="start_date" className="text-sm font-black text-zinc-700 ml-1">시작일</Label>
                      <Input
                        id="start_date"
                        type="date"
                        className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="end_date" className="text-sm font-black text-zinc-700 ml-1">종료일</Label>
                    <Input
                      id="end_date"
                      type="date"
                      className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                      고객사 배치 (하나만 선택 가능)
                      <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">
                        {formData.customer_id ? '선택됨' : '미선택'}
                      </span>
                    </Label>
                    <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                    <ScrollArea className="h-[120px] px-2">
                      <div className="grid grid-cols-2 gap-2 py-2">
                        {activeCustomers.map((customer: any) => (
                          <div
                            key={customer.id}
                            onClick={() => setFormData({...formData, customer_id: formData.customer_id === customer.id ? '' : customer.id})}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                              formData.customer_id === customer.id
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                            )}
                          >
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner",
                                formData.customer_id === customer.id ? "bg-zinc-800 text-white" : "bg-zinc-100 text-[#9CA3AF]"
                              )}>
                                C
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-black truncate">{customer.company_name}</p>
                              </div>
                              {formData.customer_id === customer.id && <Check className="h-4 w-4" />}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="grid gap-3 pb-6">
                    <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                      내부 인력 배치
                      <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">
                        {formData.memberIds.filter(id => internalUsers.some(u => u.id === id)).length}명 선택됨
                      </span>
                    </Label>
                    <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                      <ScrollArea className="h-[140px] px-2">
                        <div className="grid grid-cols-2 gap-2 py-2">
                          {internalUsers.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => toggleMember(user.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                formData.memberIds.includes(user.id)
                                  ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                  : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                              )}
                            >
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner",
                                formData.memberIds.includes(user.id) ? "bg-zinc-800 text-white" : "bg-zinc-100 text-[#9CA3AF]"
                              )}>
                                {user.role[0]}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-black truncate">{user.full_name}</p>
                                <p className={cn(
                                  "text-xs font-bold truncate opacity-60 uppercase",
                                  formData.memberIds.includes(user.id) ? "text-white" : "text-[#9CA3AF]"
                                )}>
                                  {user.role}
                                </p>
                              </div>
                              {formData.memberIds.includes(user.id) && <Check className="h-4 w-4" />}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="p-10 pt-5 border-t bg-zinc-50/50 flex-none">
              <DialogFooter>
                <Button 
                  type="submit" 
                  form="create-project-form"
                  className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : '프로젝트 생성 및 인력 배치 완료'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* 필터 및 검색 바 (UI용) */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-[1.5rem] border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] max-w-md">
        <Search className="h-5 w-5 text-[#9CA3AF] ml-2" />
        <Input 
          placeholder="프로젝트명으로 검색..." 
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-[#9CA3AF] h-10 font-bold"
        />
      </div>

      {/* 프로젝트 리스트 테이블 */}
      <Card className="border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden bg-white mt-8">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-50">
                <TableHead className="font-black py-6 pl-10 text-[#9CA3AF] uppercase text-xs tracking-widest">상태</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">프로젝트명</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">고객사</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">종류</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">기간</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">등록일</TableHead>
                <TableHead className="text-right py-6 pr-10 font-black text-[#9CA3AF] uppercase text-xs tracking-widest">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {projects && projects.length > 0 ? (
                  projects.map((project: any) => (
                    <TableRow 
                      key={project.id} 
                      className={cn(
                        "hover:bg-zinc-50/50 transition-colors border-zinc-50",
                        !project.is_active && "bg-zinc-50/30 grayscale-[0.8] opacity-70"
                      )}
                    >
                      <TableCell className="py-6 pl-10">
                        <Badge variant="outline" className={cn(
                          "px-3 py-0.5 rounded-full font-black text-xs border-2",
                          project.is_active 
                            ? "border-[#82B326] text-[#82B326] bg-[#82B326]/5" 
                            : "border-[#E53E3E] text-[#E53E3E] bg-[#E53E3E]/5"
                        )}>
                          {project.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6">
                        <span className="font-black text-zinc-900 text-base tracking-tighter">{project.name}</span>
                      </TableCell>
                      <TableCell className="py-6">
                        <span className="text-sm font-black text-[#9CA3AF]">
                          {project.customer?.company_name || '---'}
                        </span>
                      </TableCell>
                      <TableCell className="py-6">
                        <span className="font-black text-[#9CA3AF] text-sm tracking-tighter">
                          {project.project_type}
                        </span>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="text-sm font-black text-[#9CA3AF]">
                          {project.start_date?.replace(/-/g, '.') || '---'} ~ {project.end_date?.replace(/-/g, '.') || '---'}
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-[#9CA3AF] text-sm font-black">
                        {new Date(project.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell className="py-6 text-right pr-10">
                        <div className="flex items-center justify-end gap-1">
                          <EditProjectDialog project={project} allUsers={allUsers || []} customers={customers || []} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-10 px-4 rounded-xl font-black gap-2 transition-all",
                              project.is_active 
                                ? "text-[#E53E3E] hover:bg-[#E53E3E]/5 hover:text-[#E53E3E]" 
                                : "text-[#82B326] hover:bg-[#82B326]/5 hover:text-[#82B326]"
                            )}
                            onClick={() => handleToggleStatus(project.id, project.name, project.is_active)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {project.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4" />
                                비활성화
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4" />
                                활성화
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <LayoutGrid className="h-8 w-8 text-zinc-200" />
                      </div>
                      <h3 className="text-lg font-black text-zinc-900 tracking-tighter">진행 중인 프로젝트가 없습니다</h3>
                        <p className="text-[#9CA3AF] text-sm font-black mt-1">첫 번째 프로젝트를 생성하여 협업을 시작하세요.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
