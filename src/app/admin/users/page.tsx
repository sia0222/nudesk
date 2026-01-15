'use client'

import { useState } from 'react'
import { useAllUsers, useUpdateUserRole, useCreateUser, useUpdateUser, useResetPassword } from '@/hooks/use-admin'
import { useCustomers } from '@/hooks/use-customers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Loader2, ShieldAlert, Plus, Search, Edit2, KeyRound, AlertCircle, Users } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAllUsers()
  const { data: customers } = useCustomers()
  const updateRoleMutation = useUpdateUserRole()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const resetPasswordMutation = useResetPassword()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'STAFF' as 'ADMIN' | 'STAFF' | 'CUSTOMER',
    customer_id: '' as string | null,
  })

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        customer_id: user.customer_id || '',
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        full_name: '',
        email: '',
        phone: '',
        role: 'STAFF',
        customer_id: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 아이디 유효성 검사 (영어 또는 숫자)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error('아이디는 영어 또는 숫자로만 입력 가능합니다.');
      return;
    }

    // 아이디 중복 검사 (본인 제외)
    const isDuplicate = users?.some((u: any) => 
      u.username.toLowerCase() === formData.username.toLowerCase() && 
      u.id !== editingUser?.id
    );
    if (isDuplicate) {
      toast.error('이미 사용 중인 아이디입니다.');
      return;
    }

    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, formData }, {
        onSuccess: () => {
          setIsDialogOpen(false)
        }
      })
    } else {
      createUserMutation.mutate(formData, {
        onSuccess: () => {
          setIsDialogOpen(false)
        }
      })
    }
  }

  const handleResetPassword = (userId: string, username: string) => {
    if (confirm(`${username} 님의 비밀번호를 0000으로 초기화하시겠습니까?`)) {
      resetPasswordMutation.mutate(userId)
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
        icon={ShieldAlert} 
        title="인력 관리" 
        description="시스템 내 모든 유저의 권한을 관리하고 신규 인력을 등록합니다."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()}
              className="h-14 px-8 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black gap-2 shadow-xl shadow-zinc-200 transition-all active:scale-95"
            >
              <Plus className="h-6 w-6" />
              신규 인력 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10 border-none shadow-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tighter">
                  {editingUser ? '인력 정보 수정' : '신규 인력 등록'}
                </DialogTitle>
                <DialogDescription className="font-bold text-[#9CA3AF]">
                  {editingUser ? `${editingUser.username} 님의 정보를 수정합니다.` : '새로운 관리자 또는 직원의 계정 정보를 입력하세요.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-8">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-sm font-black text-zinc-700 ml-1">아이디 (사용자명)</Label>
                  <Input
                    id="username"
                    placeholder="영어 또는 숫자"
                    className={cn(
                      "h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium",
                      formData.username && (
                        !/^[a-zA-Z0-9]+$/.test(formData.username) || 
                        users?.some((u: any) => u.username.toLowerCase() === formData.username.toLowerCase() && u.id !== editingUser?.id)
                      ) && "border-red-500 focus:ring-red-500"
                    )}
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                  {formData.username && !/^[a-zA-Z0-9]+$/.test(formData.username) && (
                    <p className="text-xs text-red-500 font-bold ml-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      영어와 숫자만 사용 가능합니다.
                    </p>
                  )}
                  {formData.username && /^[a-zA-Z0-9]+$/.test(formData.username) && 
                    users?.some((u: any) => u.username.toLowerCase() === formData.username.toLowerCase() && u.id !== editingUser?.id) && (
                    <p className="text-xs text-red-500 font-bold ml-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      사용 중인 아이디입니다. 다시 입력해주세요.
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="full_name" className="text-sm font-black text-zinc-700 ml-1">이름 (성함)</Label>
                  <Input
                    id="full_name"
                    placeholder="실명 입력"
                    className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-black text-zinc-700 ml-1">이메일 (선택)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@nudesk.kr"
                    className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-sm font-black text-zinc-700 ml-1">연락처 (선택)</Label>
                  <Input
                    id="phone"
                    placeholder="010-0000-0000"
                    className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-black text-zinc-700 ml-1">권한 설정</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: any) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium">
                      <SelectValue placeholder="권한 선택" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                      <SelectItem value="ADMIN" className="font-bold py-3">ADMIN (운영 관리자)</SelectItem>
                      <SelectItem value="STAFF" className="font-bold py-3">STAFF (실무 직원)</SelectItem>
                      <SelectItem value="CUSTOMER" className="font-bold py-3">CUSTOMER (고객)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === 'CUSTOMER' && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-black text-zinc-700 ml-1">소속 고객사 선택</Label>
                    <Select 
                      value={formData.customer_id || "none"} 
                      onValueChange={(value: any) => setFormData({...formData, customer_id: value === "none" ? null : value})}
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium">
                        <SelectValue placeholder="고객사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-xl border-zinc-100">
                        <SelectItem value="none" className="font-bold py-3 text-[#9CA3AF]">선택 안 함</SelectItem>
                        {customers?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id} className="font-bold py-3">
                            {customer.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : editingUser ? (
                    '수정 완료'
                  ) : (
                    '등록 완료'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* 필터 및 검색 바 (UI용) */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-[1.5rem] border shadow-sm max-w-md">
        <Search className="h-5 w-5 text-[#9CA3AF] ml-2" />
        <Input 
          placeholder="이름 또는 아이디로 검색..." 
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-[#9CA3AF] h-10 font-bold"
        />
      </div>

      {/* 유저 리스트 테이블 */}
      <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-50">
                <TableHead className="font-black py-6 pl-10 text-[#9CA3AF] uppercase text-xs tracking-widest">현재 권한</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">아이디</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">이름</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">이메일</TableHead>
                <TableHead className="font-black py-6 text-[#9CA3AF] uppercase text-xs tracking-widest">연락처</TableHead>
                <TableHead className="text-right py-6 font-black pr-10 text-[#9CA3AF] uppercase text-xs tracking-widest">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-zinc-50/50 transition-colors border-zinc-50">
                    <TableCell className="py-6 pl-10">
                      <Badge variant="outline" className={cn(
                        "px-4 py-1 rounded-full font-black text-xs border-2 shadow-sm",
                        user.role === 'MASTER' ? "border-[#242F67] text-[#242F67] bg-[#242F67]/5" :
                        user.role === 'ADMIN' ? "border-[#82B326] text-[#82B326] bg-[#82B326]/5" : 
                        user.role === 'STAFF' ? "border-[#F6AD55] text-[#F6AD55] bg-[#F6AD55]/5" : 
                        user.role === 'CUSTOMER' ? "border-[#D98ADA] text-[#D98ADA] bg-[#D98ADA]/5" :
                        "border-zinc-200 text-[#9CA3AF] bg-zinc-50/50"
                      )}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 font-mono text-sm text-[#9CA3AF] font-bold">{user.username}</TableCell>
                    <TableCell className="py-6 font-black text-zinc-900 text-base">
                      {user.full_name}
                    </TableCell>
                    <TableCell className="py-6 text-[#9CA3AF] text-sm font-bold">{user.email || '-'}</TableCell>
                    <TableCell className="py-6 text-[#9CA3AF] text-sm font-bold">{user.phone || '-'}</TableCell>
                    <TableCell className="py-6 text-right pr-10">
                      {user.role !== 'MASTER' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-4 rounded-xl font-black gap-2 text-[#9CA3AF] hover:bg-zinc-100 hover:text-zinc-900 transition-all"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                            수정
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-4 rounded-xl font-black gap-2 text-[#E53E3E] hover:bg-[#E53E3E]/5 hover:text-[#E53E3E] transition-all"
                            onClick={() => handleResetPassword(user.id, user.username)}
                          >
                            <KeyRound className="h-4 w-4" />
                            초기화
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-16 w-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Users className="h-8 w-8 text-zinc-200" />
                      </div>
                      <h3 className="text-lg font-black text-zinc-900 tracking-tighter">등록된 인력이 없습니다</h3>
                      <p className="text-[#9CA3AF] text-sm font-black mt-1">시스템을 이용할 관리자나 직원을 등록해 주세요.</p>
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
