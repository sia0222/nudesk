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
          initial_end_date: ticketData.end_date, // 초기 종료일 보존
          status: (formData.assigned_to_ids && formData.assigned_to_ids.length > 0) ? 'ACCEPTED' : 'WAITING'
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

export function useTicket(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          requester:requester_id(full_name, username, customer:customer_id(company_name)),
          project:project_id(id, name, customer:customer_id(company_name)),
          assignees:ticket_assignees(user_id, profiles(id, full_name, username, role)),
          chats:chats(
            id,
            message,
            file_urls,
            created_at,
            sender:sender_id(id, full_name, username, role)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      
      // 채팅(댓글) 시간순 정렬
      if (data.chats) {
        data.chats.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
      
      return data
    },
    enabled: !!id,
  })
}

export function useAddComment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, message, file_urls }: { ticketId: string, message: string, file_urls?: string[] }) => {
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      const { data, error } = await supabase
        .from('chats')
        .insert([{
          ticket_id: ticketId,
          sender_id: session.userId,
          message,
          file_urls: file_urls || []
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) })
      toast.success('댓글이 등록되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`댓글 등록 실패: ${error.message}`)
    }
  })
}

export function useUpdateTicketStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string, status: string }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)

      if (error) throw error
      return { ticketId, status }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(data.ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
    onError: (error: any) => {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  })
}

export function useAssignStaffAndAccept() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, staffIds, message, endDate }: { ticketId: string, staffIds: string[], message: string, endDate?: string }) => {
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      // 1. 상태를 'ACCEPTED'로 변경 및 확정 종료일자 업데이트
      const updateData: any = { status: 'ACCEPTED' }
      if (endDate) {
        updateData.confirmed_end_date = endDate // 확정 종료일자 컬럼에 저장
        updateData.end_date = endDate // 실제 시스템 종료일도 업데이트
      }

      const { error: ticketError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)

      if (ticketError) throw ticketError

      // 2. 인력 배치 (ticket_assignees)
      if (staffIds.length > 0) {
        const assignees = staffIds.map(userId => ({
          ticket_id: ticketId,
          user_id: userId
        }))
        const { error: assigneeError } = await supabase
          .from('ticket_assignees')
          .insert(assignees)
        
        if (assigneeError) throw assigneeError
      }

      // 3. 첫 번째 댓글(내용) 등록
      if (message.trim()) {
        const { error: chatError } = await supabase
          .from('chats')
          .insert([{
            ticket_id: ticketId,
            sender_id: session.userId,
            message
          }])
        
        if (chatError) throw chatError
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      toast.success('접수가 완료되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`접수 실패: ${error.message}`)
    }
  })
}

export function useStartWork() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, message, file_urls, staffIds, endDate }: { ticketId: string, message: string, file_urls?: string[], staffIds?: string[], endDate?: string }) => {
      const session = getCurrentSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      // 1. 상태를 'IN_PROGRESS'로 변경 및 확정 종료일자 업데이트
      const updateData: any = { status: 'IN_PROGRESS' }
      if (endDate) {
        updateData.confirmed_end_date = endDate // 확정 종료일자 컬럼에 저장
        updateData.end_date = endDate // 실제 시스템 종료일도 업데이트
      }

      const { error: ticketError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)

      if (ticketError) throw ticketError

      // 2. 인력 배치가 필요한 경우 (고객 접수 건)
      if (staffIds && staffIds.length > 0) {
        const assignees = staffIds.map(userId => ({
          ticket_id: ticketId,
          user_id: userId
        }))
        const { error: assigneeError } = await supabase
          .from('ticket_assignees')
          .insert(assignees)
        
        if (assigneeError) throw assigneeError
      }

      // 3. 업무 시작 메시지 등록
      const { error: chatError } = await supabase
        .from('chats')
        .insert([{
          ticket_id: ticketId,
          sender_id: session.userId,
          message,
          file_urls: file_urls || []
        }])

      if (chatError) throw chatError
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      toast.success('업무가 진행 상태로 변경되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`업무 시작 실패: ${error.message}`)
    }
  })
}

export function useProjectStaffs(projectId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['project-staffs', projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
      
      if (!members || members.length === 0) return []
      
      const userIds = members.map(m => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .in('role', ['ADMIN', 'STAFF'])
      
      return profiles || []
    },
    enabled: !!projectId,
  })
}
