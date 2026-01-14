import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { registerUserAction, updateUserAction, resetPasswordAction } from '@/app/admin/users/actions'

export const adminKeys = {
  all: ['admin'] as const,
  allUsers: () => [...adminKeys.all, 'all-users'] as const,
  projectUsers: () => [...adminKeys.all, 'project-users'] as const,
}

export function useAllUsers() {
  const supabase = createClient()

  return useQuery({
    queryKey: adminKeys.allUsers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

export function useProjectUsers() {
  const supabase = createClient()

  return useQuery({
    queryKey: adminKeys.projectUsers(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'MASTER') // MASTER 역할 제외
        .order('role', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

export function useUpdateUserRole() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.allUsers() })
      toast.success('사용자 권한이 변경되었습니다.')
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: registerUserAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.allUsers() })
      toast.success('신규 인력이 성공적으로 등록되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`등록 실패: ${error.message}`)
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, formData }: { id: string, formData: any }) => updateUserAction(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.allUsers() })
      toast.success('사용자 정보가 수정되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`수정 실패: ${error.message}`)
    }
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => resetPasswordAction(id),
    onSuccess: () => {
      toast.success('비밀번호가 0000으로 초기화되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`초기화 실패: ${error.message}`)
    }
  })
}
