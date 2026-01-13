import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { getCurrentSession } from '@/lib/authHelpers'

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
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      let query = supabase
        .from('tickets')
        .select(`
          *,
          requester:requester_id(full_name, username),
          assigned:assigned_to(full_name, username),
          project:project_id(name)
        `)
        .order('created_at', { ascending: false })

      // 현재 사용자가 참여 중인 프로젝트의 티켓만 조회
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.userId)

      if (memberships && memberships.length > 0) {
        const projectIds = memberships.map(m => m.project_id)
        query = query.in('project_id', projectIds)
      } else {
        // 참여 중인 프로젝트가 없으면 빈 결과 반환
        return []
      }

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
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          ...newTicket,
          requester_id: session.userId,
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
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'ACCEPTED',
          assigned_to: session.userId,
          deadline: deadline
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
