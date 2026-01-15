'use client'

import { useState } from 'react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useToggleCustomerStatus } from '@/hooks/use-customers'
import { useAllUsers } from '@/hooks/use-admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Building2, Plus, Search, Edit2, Trash2, FileText, Paperclip, Check, Power, PowerOff } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from '@/utils/supabase/client'

export default function AdminCustomersPage() {
  const { data: customers, isLoading } = useCustomers()
  const { data: allUsers } = useAllUsers()
  const createCustomerMutation = useCreateCustomer()
  const updateCustomerMutation = useUpdateCustomer()
  const toggleStatusMutation = useToggleCustomerStatus()
  const supabase = createClient()
  
  const customerIndividuals = allUsers?.filter(u => u.role === 'CUSTOMER') || []

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [formData, setFormData] = useState({
    company_name: '',
    tel: '',
    attachments: [] as any[],
    userIds: [] as string[]
  })
  const [isUploading, setIsUploading] = useState(false)

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        company_name: customer.company_name,
        tel: customer.tel || '',
        attachments: customer.customer_attachments || [],
        userIds: customer.profiles?.map((p: any) => p.id) || []
      })
    } else {
      setEditingCustomer(null)
      setFormData({
        company_name: '',
        tel: '',
        attachments: [],
        userIds: []
      })
    }
    setIsDialogOpen(true)
  }

  const toggleUserSelection = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newAttachments = [...formData.attachments]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `customer-files/${fileName}`

      // 1. 버킷 존재 확인 및 업로드 시도
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('customers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        // 에러 메시지에 따른 상세 안내
        let helperMsg = '버킷(customers)이 없거나 권한이 없습니다.';
        if (uploadError.message.includes('bucket_not_found')) {
          helperMsg = "Supabase Dashboard에서 'customers' 버킷을 먼저 생성해주세요.";
        }
        toast.error(`파일 업로드 실패: ${file.name}\n(${helperMsg})`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('customers')
        .getPublicUrl(filePath)

      newAttachments.push({
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type.includes('pdf') ? 'CONTRACT' : 'DOCUMENT'
      })
    }

    setFormData({ ...formData, attachments: newAttachments })
    setIsUploading(false)
  }

  const removeAttachment = (index: number) => {
    const newAttachments = [...formData.attachments]
    newAttachments.splice(index, 1)
    setFormData({ ...formData, attachments: newAttachments })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, ...formData }, {
        onSuccess: () => setIsDialogOpen(false)
      })
    } else {
      createCustomerMutation.mutate(formData, {
        onSuccess: () => setIsDialogOpen(false)
      })
    }
  }

  const handleToggleStatus = (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? '비활성화' : '활성화'
    if (confirm(`${name} 고객사를 ${action}하시겠습니까?`)) {
      toggleStatusMutation.mutate({ id, is_active: !currentStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader 
        icon={Building2} 
        title="고객사 관리" 
        description="서비스를 이용하는 고객사를 등록하고 관련 서류를 관리합니다."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()}
              className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black gap-2 shadow-xl shadow-zinc-200 transition-all active:scale-95"
            >
              <Plus className="h-6 w-6" />
              신규 고객사 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="p-10 pb-5">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tighter">
                    {editingCustomer ? '고객사 정보 수정' : '신규 고객사 등록'}
                  </DialogTitle>
                  <DialogDescription className="font-bold text-[#9CA3AF]">
                    {editingCustomer ? `${editingCustomer.company_name} 정보를 수정합니다.` : '새로운 고객사의 정보를 입력하세요.'}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <ScrollArea className="flex-1 px-10">
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company_name" className="text-sm font-black text-zinc-700 ml-1">회사명</Label>
                    <Input
                      id="company_name"
                      placeholder="회사 이름 입력"
                      className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tel" className="text-sm font-black text-zinc-700 ml-1">연락처</Label>
                    <Input
                      id="tel"
                      placeholder="02-000-0000"
                      className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                      value={formData.tel}
                      onChange={(e) => setFormData({...formData, tel: e.target.value})}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                      소속 고객 인력 (다수 선택 가능)
                      <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">
                        {formData.userIds.length}명 선택됨
                      </span>
                    </Label>
                    <div className="bg-zinc-50 rounded-[1.5rem] p-2 border border-zinc-100">
                      <ScrollArea className="h-[150px] px-2">
                        <div className="grid grid-cols-2 gap-2 py-2">
                          {customerIndividuals.map((user: any) => (
                            <div
                              key={user.id}
                              onClick={() => toggleUserSelection(user.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                formData.userIds.includes(user.id)
                                  ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                  : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                              )}
                            >
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black italic shadow-inner",
                                formData.userIds.includes(user.id) ? "bg-zinc-800 text-white" : "bg-zinc-100 text-[#9CA3AF]"
                              )}>
                                {user.full_name?.[0] || 'U'}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-black truncate">{user.full_name}</p>
                                <p className={cn(
                                  "text-xs font-bold truncate opacity-60 uppercase",
                                  formData.userIds.includes(user.id) ? "text-white" : "text-[#9CA3AF]"
                                )}>
                                  {user.username}
                                </p>
                              </div>
                              {formData.userIds.includes(user.id) && <Check className="h-4 w-4" />}
                            </div>
                          ))}
                          {customerIndividuals.length === 0 && (
                            <div className="col-span-2 py-8 text-center text-[#9CA3AF] text-xs font-bold">
                              등록된 고객 인력이 없습니다.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                  
                  <div className="grid gap-3 pt-2">
                    <Label className="text-sm font-black text-zinc-700 ml-1 flex items-center justify-between">
                      관련 서류 (계약서/세금계산서)
                      <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">
                        {formData.attachments.length}개 업로드됨
                      </span>
                    </Label>
                    <div className="grid gap-2">
                      <div className="flex flex-wrap gap-2">
                        {formData.attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 px-3 py-2 rounded-xl group transition-all hover:bg-white hover:shadow-sm">
                            <FileText className="h-4 w-4 text-[#9CA3AF]" />
                            <span className="text-xs font-bold text-zinc-600 truncate max-w-[150px]">{file.file_name}</span>
                            <button 
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center justify-center gap-2 h-14 w-full rounded-2xl border-2 border-dashed border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer">
                        <Paperclip className="h-5 w-5 text-[#9CA3AF]" />
                        <span className="text-sm font-black text-[#9CA3AF]">파일 첨부하기</span>
                        <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                        {isUploading && <Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" />}
                      </label>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-10 pt-5">
                <DialogFooter>
                  <Button 
                    type="submit" 
                    className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending || isUploading}
                  >
                    {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : editingCustomer ? (
                      '정보 수정 완료'
                    ) : (
                      '고객사 등록 완료'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex items-center gap-3 bg-white p-3 rounded-[1.5rem] border shadow-sm max-w-md">
        <Search className="h-5 w-5 text-[#9CA3AF] ml-2" />
        <Input 
          placeholder="회사명으로 검색..." 
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-[#9CA3AF] h-10 font-bold"
        />
      </div>

      <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white mt-8">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-50">
                <TableHead className="font-black py-6 pl-10 text-[#9CA3AF] uppercase text-xs tracking-widest">상태</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">회사명</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">연락처</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">소속 인력</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">관련 서류</TableHead>
                <TableHead className="text-right py-6 font-black pr-10 text-[#9CA3AF] uppercase text-xs tracking-widest">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {customers && customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id} className={cn(
                    "hover:bg-zinc-50/50 transition-colors border-zinc-50",
                    !customer.is_active && "opacity-50 grayscale bg-zinc-50/30"
                  )}>
                    <TableCell className="py-6 pl-10">
                      <Badge variant="outline" className={cn(
                        "px-3 py-0.5 rounded-full font-black text-xs border-2",
                        customer.is_active 
                          ? "border-[#82B326] text-[#82B326] bg-[#82B326]/5" 
                          : "border-[#E53E3E] text-[#E53E3E] bg-[#E53E3E]/5"
                      )}>
                        {customer.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 font-black text-zinc-900 text-base">{customer.company_name}</TableCell>
                    <TableCell className="py-6 text-[#9CA3AF] text-sm font-bold">{customer.tel || '-'}</TableCell>
                    <TableCell className="py-6">
                      <div className="flex -space-x-2">
                        {customer.profiles?.slice(0, 3).map((p: any, i: number) => (
                          <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-xs font-black text-[#9CA3AF] shadow-sm" title={p.full_name}>
                            {p.full_name?.[0]}
                          </div>
                        ))}
                        {customer.profiles?.length > 3 && (
                          <div className="h-7 w-7 rounded-full border-2 border-white bg-zinc-900 flex items-center justify-center text-xs font-black text-white shadow-sm">
                            +{customer.profiles.length - 3}
                          </div>
                        )}
                        {(!customer.profiles || customer.profiles.length === 0) && (
                          <span className="text-[#9CA3AF] text-sm font-bold">없음</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex gap-1 flex-wrap">
                        {customer.customer_attachments?.map((att: any, i: number) => (
                          <a 
                            key={i} 
                            href={att.file_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="h-7 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="h-3 w-3 text-[#9CA3AF]" />
                            <span className="text-sm font-black text-[#9CA3AF]">서류{i+1}</span>
                          </a>
                        ))}
                        {(!customer.customer_attachments || customer.customer_attachments.length === 0) && (
                          <span className="text-[#9CA3AF] text-sm font-bold">없음</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6 text-right pr-10">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 px-4 rounded-xl font-black gap-2 text-[#9CA3AF] hover:bg-zinc-100 hover:text-zinc-900 transition-all"
                          onClick={() => handleOpenDialog(customer)}
                        >
                        <Edit2 className="h-4 w-4" />
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-10 px-4 rounded-xl font-black gap-2 transition-all",
                          customer.is_active 
                            ? "text-[#E53E3E] hover:bg-[#E53E3E]/5 hover:text-[#E53E3E]" 
                            : "text-[#82B326] hover:bg-[#82B326]/5 hover:text-[#82B326]"
                        )}
                        onClick={() => handleToggleStatus(customer.id, customer.company_name, customer.is_active)}
                      >
                        {customer.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        {customer.is_active ? '비활성화' : '활성화'}
                      </Button>
                    </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Building2 className="h-8 w-8 text-zinc-200" />
                      </div>
                      <h3 className="text-lg font-normal text-zinc-900 tracking-tighter">등록된 고객사가 없습니다</h3>
                      <p className="text-[#9CA3AF] text-sm font-normal mt-1">새로운 고객사를 등록하고 인력을 배치해 주세요.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
