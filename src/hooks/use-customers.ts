import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
}

export function useCustomers() {
  const supabase = createClient()

  return useQuery({
    queryKey: customerKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_attachments (*),
          profiles (*)
        `)
        .order('company_name', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

export function useCreateCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ company_name, tel, attachments, userIds }: any) => {
      // 1. 고객사 생성
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{ company_name, tel }])
        .select()
        .single()

      if (customerError) throw customerError

      // 2. 첨부파일 등록
      if (attachments && attachments.length > 0) {
        const attachmentInserts = attachments.map((att: any) => ({
          customer_id: customer.id,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type
        }))

        const { error: attError } = await supabase
          .from('customer_attachments')
          .insert(attachmentInserts)

        if (attError) throw attError
      }

      // 3. 인력 소속 변경
      if (userIds && userIds.length > 0) {
        const { error: userError } = await supabase
          .from('profiles')
          .update({ customer_id: customer.id })
          .in('id', userIds)

        if (userError) throw userError
      }

      return customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
      toast.success('고객사가 성공적으로 등록되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`등록 실패: ${error.message}`)
    }
  })
}

export function useUpdateCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, company_name, tel, attachments, userIds, is_active }: any) => {
      // 1. 고객사 정보 업데이트
      const updateData: any = { company_name, tel }
      if (typeof is_active === 'boolean') updateData.is_active = is_active

      const { error: customerError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)

      if (customerError) throw customerError

      // 2. 기존 첨부파일 삭제 후 재등록 (수정 모드일 때만)
      if (attachments) {
        await supabase.from('customer_attachments').delete().eq('customer_id', id)
        
        if (attachments.length > 0) {
          const attachmentInserts = attachments.map((att: any) => ({
            customer_id: id,
            file_name: att.file_name,
            file_url: att.file_url,
            file_type: att.file_type
          }))

          const { error: attError } = await supabase
            .from('customer_attachments')
            .insert(attachmentInserts)

          if (attError) throw attError
        }
      }

      // 3. 인력 소속 업데이트 (userIds가 전달되었을 때만)
      if (userIds) {
        // 먼저 이 고객사에 소속되어 있던 사람들을 모두 해제
        await supabase.from('profiles').update({ customer_id: null }).eq('customer_id', id)
        
        // 새로 선택된 사람들을 이 고객사에 할당
        if (userIds.length > 0) {
          const { error: userError } = await supabase
            .from('profiles')
            .update({ customer_id: id })
            .in('id', userIds)

          if (userError) throw userError
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
      toast.success('고객사 정보가 처리되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`처리 실패: ${error.message}`)
    }
  })
}

export function useToggleCustomerStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('customers')
        .update({ is_active })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      toast.success('고객사 상태가 변경되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  })
}
