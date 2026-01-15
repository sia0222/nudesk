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
    mutationFn: async ({ id, company_name, tel, attachments, userIds }: any) => {
      // 1. 고객사 정보 업데이트
      const { error: customerError } = await supabase
        .from('customers')
        .update({ company_name, tel })
        .eq('id', id)

      if (customerError) throw customerError

      // 2. 기존 첨부파일 삭제 후 재등록
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

      // 3. 인력 소속 업데이트 (기존 소속 해제 후 새 소속 설정)
      // 먼저 이 고객사에 소속되어 있던 사람들을 모두 해제
      await supabase.from('profiles').update({ customer_id: null }).eq('customer_id', id)
      
      // 새로 선택된 사람들을 이 고객사에 할당
      if (userIds && userIds.length > 0) {
        const { error: userError } = await supabase
          .from('profiles')
          .update({ customer_id: id })
          .in('id', userIds)

        if (userError) throw userError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] })
      toast.success('고객사 정보가 수정되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`수정 실패: ${error.message}`)
    }
  })
}

export function useDeleteCustomer() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      toast.success('고객사가 삭제되었습니다.')
    },
    onError: (error: any) => {
      toast.error(`삭제 실패: ${error.message}`)
    }
  })
}
