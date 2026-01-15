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

      // 현재 유저의 정보(role, customer_id) 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, customer_id')
        .eq('id', session.userId)
        .single()

      let query = supabase
        .from('tickets')
        .select(`
          *,
          requester:requester_id(full_name, username),
          project:project_id(name),
          assignees:ticket_assignees(user_id, profiles(full_name, username))
        `)
        .order('created_at', { ascending: false })

      // 권한 및 소속에 따른 프로젝트 ID 필터링
      let projectIds: string[] = []

      if (profile?.role === 'CUSTOMER' && profile?.customer_id) {
        // 고객(CUSTOMER) 권한: 본인 회사(customer_id)에 할당된 프로젝트 ID 조회
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('customer_id', profile.customer_id)
        
        if (projects) projectIds = projects.map(p => p.id)
      } else {
        // MASTER, ADMIN, STAFF 권한: 참여 중인(project_members) 프로젝트 ID 조회
        const { data: memberships } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', session.userId)

        if (memberships) projectIds = memberships.map(m => m.project_id)
      }

      // 소속된 프로젝트가 없으면 빈 목록 반환 (MASTER 포함 모든 권한 공통 적용)
      if (projectIds.length === 0) return []

      // 티켓 조회 시 소속 프로젝트 ID로 필터링
      query = query.in('project_id', projectIds)

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
    mutationFn: async (formData: any) => {
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      // 현재 유저의 customer_id 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('customer_id')
        .eq('id', session.userId)
        .single()

      const { assigned_to_ids, files, ...ticketData } = formData;

      // 1. 티켓 생성
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert([{
          ...ticketData,
          requester_id: session.userId,
          customer_id: profile?.customer_id || null, // 고객사 ID 자동 할당
          status: 'WAITING'
        }])
        .select()
        .single()

      if (ticketError) throw ticketError

      // 2. 다중 담당자 배정
      if (assigned_to_ids && assigned_to_ids.length > 0) {
        const assignees = assigned_to_ids.map((userId: string) => ({
          ticket_id: ticket.id,
          user_id: userId
        }))
        const { error: assigneeError } = await supabase
          .from('ticket_assignees')
          .insert(assignees)
        
        if (assigneeError) throw assigneeError
      }

      return ticket
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
          deadline: deadline
        })
        .eq('id', ticketId)

      if (error) throw error

      // 수락한 사람을 담당자로 추가
      await supabase.from('ticket_assignees').upsert({
        ticket_id: ticketId,
        user_id: session.userId
      })
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
