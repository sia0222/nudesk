'use client'

import { useState, useEffect } from 'react'
import { useProjects, useCreateProject, useUpdateProject, useProjectMembers } from '@/hooks/use-projects'
import { useProjectUsers } from '@/hooks/use-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  FolderKanban, 
  Users, 
  Calendar, 
  Loader2, 
  Check, 
  Briefcase,
  Edit2
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

// --- 프로젝트 수정 다이얼로그 컴포넌트 ---
function EditProjectDialog({ project, allUsers }: { project: any, allUsers: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full h-12 rounded-xl font-black text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 group-hover:bg-zinc-100 transition-all gap-2">
          정보 수정하기
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-8 gap-8 border-none shadow-2xl">
        <form onSubmit={handleUpdate} className="space-y-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter">프로젝트 정보 수정</DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              프로젝트 정보를 변경하고 인력을 다시 배치할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
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
            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-sm font-black text-zinc-700 ml-1">상세 설명</Label>
              <Textarea
                id="edit-description"
                placeholder="프로젝트에 대한 간단한 설명을 적어주세요"
                className="min-h-[100px] rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 py-4 font-medium"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid gap-3">
              <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                인력 재배치 
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                  {formData.memberIds.length} Selected
                </span>
              </Label>
              <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                <ScrollArea className="h-[180px] px-2">
                  <div className="grid grid-cols-2 gap-2 py-2">
                    {allUsers?.map((user) => (
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
                          "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black italic shadow-inner",
                          formData.memberIds.includes(user.id) ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {user.role[0]}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-black truncate">{user.full_name}</p>
                          <p className={cn(
                            "text-[10px] font-bold truncate opacity-60 uppercase",
                            formData.memberIds.includes(user.id) ? "text-white" : "text-zinc-400"
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
          </div>

          <DialogFooter>
            <Button 
              type="submit" 
              className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : '수정 완료 및 인력 재배치'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- 메인 페이지 컴포넌트 ---
export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects()
  const { data: allUsers } = useProjectUsers()
  const createProjectMutation = useCreateProject()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    memberIds: [] as string[]
  })

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    createProjectMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setFormData({ name: '', description: '', memberIds: [] })
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

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 py-6">
      {/* 상단 헤더 섹션 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-xl shadow-zinc-200">
            <Briefcase className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900">프로젝트 관리</h1>
            <p className="text-zinc-500 font-medium mt-1">실무 그룹을 생성하고 프로젝트별 인력을 배치합니다.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black gap-2 shadow-xl shadow-zinc-200 transition-all active:scale-95">
              <Plus className="h-6 w-6" />
              새 프로젝트 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-8 gap-8 border-none shadow-2xl">
            <form onSubmit={handleCreateProject} className="space-y-8">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tighter">새 프로젝트 생성</DialogTitle>
                <DialogDescription className="text-zinc-500 font-medium">
                  프로젝트의 기본 정보를 입력하고 함께 할 인력을 배치하세요.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6">
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
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-black text-zinc-700 ml-1">상세 설명</Label>
                  <Textarea
                    id="description"
                    placeholder="프로젝트에 대한 간단한 설명을 적어주세요"
                    className="min-h-[100px] rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 py-4 font-medium"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid gap-3">
                  <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                    인력 배치 
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                      {formData.memberIds.length} Selected
                    </span>
                  </Label>
                  <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                    <ScrollArea className="h-[180px] px-2">
                      <div className="grid grid-cols-2 gap-2 py-2">
                        {allUsers?.map((user) => (
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
                              "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black italic shadow-inner",
                              formData.memberIds.includes(user.id) ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-400"
                            )}>
                              {user.role[0]}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-black truncate">{user.full_name}</p>
                              <p className={cn(
                                "text-[10px] font-bold truncate opacity-60 uppercase",
                                formData.memberIds.includes(user.id) ? "text-white" : "text-zinc-400"
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
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : '프로젝트 생성 및 인력 배치 완료'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 프로젝트 리스트 */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {projects && projects.length > 0 ? (
            projects.map((project: any, index: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full border-none shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-[2rem] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all group overflow-hidden bg-white">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-zinc-50 text-zinc-900 flex items-center justify-center shadow-inner group-hover:bg-zinc-900 group-hover:text-white transition-all duration-500">
                        <FolderKanban className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="rounded-full px-4 py-1 font-bold border-zinc-100 text-zinc-400 group-hover:bg-zinc-50 transition-colors">
                        Active
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tighter text-zinc-900 group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-zinc-500 font-medium min-h-[40px] pt-1">
                      {project.description || '프로젝트 상세 설명이 등록되지 않았습니다.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-4 space-y-6">
                    <div className="h-px bg-zinc-100 w-full" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-9 w-9 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-400 shadow-sm">
                              {i}
                            </div>
                          ))}
                          {project.members?.[0]?.count > 3 && (
                            <div className="h-9 w-9 rounded-full border-2 border-white bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                              +{project.members?.[0]?.count - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-black text-zinc-900 ml-1">
                          {project.members?.[0]?.count || 0}명의 인력 배치됨
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(project.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    
                    {/* 수정하기 버튼 (다이얼로그 포함) */}
                    <EditProjectDialog project={project} allUsers={allUsers || []} />
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-32 text-center border-4 border-dashed rounded-[3rem] border-zinc-100 bg-zinc-50/30"
            >
              <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-50">
                <FolderKanban className="h-12 w-12 text-zinc-200" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 tracking-tighter">진행 중인 프로젝트가 없습니다</h3>
              <p className="text-zinc-400 font-medium mt-2 max-w-[300px] mx-auto">
                첫 번째 프로젝트를 생성하고 팀원들을 배치하여 협업을 시작하세요.
              </p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="mt-8 h-14 px-8 rounded-2xl bg-white border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white font-black transition-all shadow-xl shadow-zinc-100"
              >
                지금 프로젝트 생성하기
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
