import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: any) => [...ticketKeys.lists(), { filters }] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
}

export function useTickets(filters?: any) {
  const supabase = createClient()

  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_id(full_name, username),
          assigned:assigned_staff_id(full_name, username),
          project:project_id(name)
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.project_id) query = query.eq('project_id', filters.project_id)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useCreateTicket() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newTicket: any) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { data, error } = await supabase
        .from('tickets')
        .insert([{ 
          ...newTicket, 
          customer_id: user.id,
          status: 'WAITING' 
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      toast.success('접수가 완료되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`접수 실패: ${error.message}`)
    }
  })
}

export function useAcceptTicket() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, deadline }: { ticketId: string, deadline: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증되지 않은 사용자입니다.')

      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: 'ACCEPTED', 
          assigned_staff_id: user.id,
          deadline: deadline,
          is_auto_assigned: false
        })
        .eq('id', ticketId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all })
      toast.success('티켓을 수락했습니다.')
    },
    onError: (error: any) => {
      toast.error(`수락 실패: ${error.message}`)
    }
  })
}
