'use client'

import { useState } from 'react'
import { useAllUsers, useUpdateUserRole, useCreateUser } from '@/hooks/use-admin'
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
import { Loader2, ShieldAlert, UserPlus, Search } from 'lucide-react'

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAllUsers()
  const updateRoleMutation = useUpdateUserRole()
  const createUserMutation = useCreateUser()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role: 'STAFF' as 'ADMIN' | 'STAFF' | 'CUSTOMER',
    password: ''
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    createUserMutation.mutate(formData, {
      onSuccess: () => {
        setIsDialogOpen(false)
        setFormData({ username: '', full_name: '', role: 'STAFF', password: '' })
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* 상단 헤더 섹션 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-lg">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-zinc-900">인력 관리</h1>
            <p className="text-zinc-500 font-medium">시스템 내 모든 유저의 권한을 관리하고 신규 인력을 등록합니다.</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold gap-2 shadow-lg transition-all active:scale-95">
              <UserPlus className="h-5 w-5" />
              신규 인력 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-3xl">
            <form onSubmit={handleRegister}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">신규 인력 등록</DialogTitle>
                <DialogDescription className="font-medium">
                  새로운 관리자 또는 직원의 계정 정보를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="username" className="font-bold">아이디 (Username)</Label>
                  <Input
                    id="username"
                    placeholder="영어/숫자 조합"
                    className="h-11 rounded-xl"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="full_name" className="font-bold">이름 (Full Name)</Label>
                  <Input
                    id="full_name"
                    placeholder="실명 입력"
                    className="h-11 rounded-xl"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="font-bold">임시 비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="6자 이상 입력"
                    className="h-11 rounded-xl"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold">권한 설정</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: any) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="권한 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN (운영 관리자)</SelectItem>
                      <SelectItem value="STAFF">STAFF (실무 직원)</SelectItem>
                      <SelectItem value="CUSTOMER">CUSTOMER (고객)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl font-bold bg-zinc-900 hover:bg-zinc-800"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : '등록 완료'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 필터 및 검색 바 (UI용) */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm max-w-md">
        <Search className="h-5 w-5 text-zinc-400 ml-2" />
        <Input 
          placeholder="이름 또는 아이디로 검색..." 
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-zinc-400"
        />
      </div>

      {/* 유저 리스트 테이블 */}
      <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow>
                <TableHead className="font-bold py-4 pl-6 text-zinc-900">아이디</TableHead>
                <TableHead className="font-bold text-zinc-900">이름</TableHead>
                <TableHead className="font-bold text-zinc-900">현재 권한</TableHead>
                <TableHead className="text-right font-bold pr-6 text-zinc-900">권한 변경</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-mono text-sm py-4 pl-6 text-zinc-600 font-medium">{user.username}</TableCell>
                  <TableCell className="font-bold text-zinc-900">{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "px-3 py-0.5 rounded-full font-bold border-2",
                      user.role === 'MASTER' ? "border-zinc-900 text-zinc-900" :
                      user.role === 'ADMIN' ? "border-blue-500 text-blue-600" : 
                      user.role === 'STAFF' ? "border-emerald-500 text-emerald-600" : "border-zinc-200 text-zinc-400"
                    )}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {user.role !== 'MASTER' && (
                      <div className="flex justify-end gap-2">
                        <Select
                          disabled={updateRoleMutation.isPending}
                          defaultValue={user.role}
                          onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                        >
                          <SelectTrigger className="w-[120px] h-9 rounded-lg font-bold border-zinc-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="STAFF">STAFF</SelectItem>
                            <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
