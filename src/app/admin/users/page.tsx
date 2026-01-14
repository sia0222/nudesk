'use client'

import { useState } from 'react'
import { useAllUsers, useUpdateUserRole, useCreateUser, useUpdateUser, useResetPassword } from '@/hooks/use-admin'
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
import { Loader2, ShieldAlert, UserPlus, Search, Edit2, KeyRound } from 'lucide-react'
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/layout/page-header"

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAllUsers()
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
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        full_name: '',
        email: '',
        phone: '',
        role: 'STAFF',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
              <UserPlus className="h-6 w-6" />
              신규 인력 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10 border-none shadow-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-3xl font-black tracking-tighter">
                  {editingUser ? '인력 정보 수정' : '신규 인력 등록'}
                </DialogTitle>
                <DialogDescription className="font-bold text-zinc-400">
                  {editingUser ? `${editingUser.username} 님의 정보를 수정합니다.` : '새로운 관리자 또는 직원의 계정 정보를 입력하세요.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-8">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="text-sm font-black text-zinc-700 ml-1">아이디 (사용자명)</Label>
                  <Input
                    id="username"
                    placeholder="영어/숫자 조합"
                    className="h-14 rounded-2xl border-zinc-200 focus:ring-zinc-900 px-5 font-medium"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
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
        <Search className="h-5 w-5 text-zinc-400 ml-2" />
        <Input 
          placeholder="이름 또는 아이디로 검색..." 
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-zinc-400 h-10 font-bold"
        />
      </div>

      {/* 유저 리스트 테이블 */}
      <Card className="border-none shadow-[0_10px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-50">
                <TableHead className="font-black py-6 pl-10 text-zinc-400 uppercase text-[10px] tracking-widest">아이디</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">이름</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">이메일</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">연락처</TableHead>
                <TableHead className="font-black text-zinc-400 uppercase text-[10px] tracking-widest">현재 권한</TableHead>
                <TableHead className="text-right font-black pr-10 text-zinc-400 uppercase text-[10px] tracking-widest">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} className="hover:bg-zinc-50/50 transition-colors border-zinc-50">
                  <TableCell className="font-mono text-xs py-6 pl-10 text-zinc-500 font-bold">{user.username}</TableCell>
                  <TableCell className="font-black text-zinc-900">{user.full_name}</TableCell>
                  <TableCell className="text-zinc-500 text-sm font-bold">{user.email || '-'}</TableCell>
                  <TableCell className="text-zinc-500 text-sm font-bold">{user.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "px-4 py-1 rounded-full font-black text-[10px] border-2 shadow-sm",
                      user.role === 'MASTER' ? "border-zinc-900 bg-zinc-900 text-white" :
                      user.role === 'ADMIN' ? "border-blue-500 text-blue-600 bg-blue-50/50" : 
                      user.role === 'STAFF' ? "border-emerald-500 text-emerald-600 bg-emerald-50/50" : "border-zinc-200 text-zinc-400 bg-zinc-50/50"
                    )}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    {user.role !== 'MASTER' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 px-4 rounded-xl font-black gap-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 px-4 rounded-xl font-black gap-2 text-amber-600 hover:bg-amber-50 transition-all"
                          onClick={() => handleResetPassword(user.id, user.username)}
                        >
                          <KeyRound className="h-4 w-4" />
                          초기화
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
