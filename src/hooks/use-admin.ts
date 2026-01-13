import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { registerUserAction } from '@/app/admin/users/actions'

export const adminKeys = {
  all: ['admin'] as const,
  allUsers: () => [...adminKeys.all, 'all-users'] as const,
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
