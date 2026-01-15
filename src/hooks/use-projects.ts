import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
}

export function useProjects() {
  const supabase = createClient()

  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      // 프로젝트 목록과 멤버 수 조회
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          members:project_members(count),
          customer:customers(company_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useProjectMembers(projectId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('project_id', projectId)

      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, project_type, start_date, end_date, memberIds, customer_id }: { name: string, project_type: '개발' | '유지', start_date: string, end_date: string, memberIds: string[], customer_id?: string | null }) => {
      // 1. 프로젝트 생성
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{ name, project_type, start_date: start_date || null, end_date: end_date || null, customer_id }])
        .select()
        .single()

      if (projectError) throw projectError

      // 2. 멤버 배정 (선택된 멤버가 있을 경우)
      if (memberIds && memberIds.length > 0) {
        const membersToInsert = memberIds.map(profileId => ({
          project_id: project.id,
          user_id: profileId
        }))

        const { error: membersError } = await supabase
          .from('project_members')
          .insert(membersToInsert)

        if (membersError) throw membersError
      }

      return project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success('새 프로젝트가 생성되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`프로젝트 생성 실패: ${error.message}`)
    }
  })
}

export function useUpdateProject() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name, project_type, start_date, end_date, memberIds, customer_id, is_active }: { id: string, name: string, project_type: '개발' | '유지', start_date: string, end_date: string, memberIds: string[], customer_id?: string | null, is_active?: boolean }) => {
      // 1. 프로젝트 기본 정보 업데이트
      const updateData: any = { name, project_type, start_date: start_date || null, end_date: end_date || null, customer_id }
      if (typeof is_active === 'boolean') updateData.is_active = is_active

      const { error: projectError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)

      if (projectError) throw projectError

      // 2. 기존 멤버 삭제 후 재배정 (단순화된 방식)
      const { error: deleteError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', id)

      if (deleteError) throw deleteError

      if (memberIds && memberIds.length > 0) {
        const membersToInsert = memberIds.map(profileId => ({
          project_id: id,
          user_id: profileId
        }))

        const { error: membersError } = await supabase
          .from('project_members')
          .insert(membersToInsert)

        if (membersError) throw membersError
      }

      return { id }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(data.id), 'members'] })
      toast.success('프로젝트 정보가 수정되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`프로젝트 수정 실패: ${error.message}`)
    }
  })
}

export function useAddProjectMember() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, profileId }: { projectId: string, profileId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .insert([{ project_id: projectId, user_id: profileId }])

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(variables.projectId), 'members'] })
      toast.success('멤버가 추가되었습니다.')
    },
  })
}

export function useRemoveProjectMember() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, profileId }: { projectId: string, profileId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', profileId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(variables.projectId), 'members'] })
      toast.success('멤버가 제외되었습니다.')
    },
  })
}

export function useToggleProjectStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('projects')
        .update({ is_active })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success('프로젝트 상태가 변경되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  })
}
