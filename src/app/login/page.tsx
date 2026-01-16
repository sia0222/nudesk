'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signInWithUsername } from '@/lib/authHelpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Lock, User } from 'lucide-react'
export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log('[Login] Attempting sign in with:', username)
      const { profile } = await signInWithUsername(username, password)
      console.log('[Login] Sign in successful:', profile)
      toast.success(`${profile.full_name}님, 환영합니다!`)

      // 모든 유저는 통합 대시보드(Home)로 진입
      router.push('/dashboard')
    } catch (error: any) {
      console.error('[Login] Error:', error)
      toast.error(error.message || '로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="inline-flex mb-6 justify-center">
            <div className="relative h-24 w-24 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white bg-white">
              <Image 
                src="/logo.png" 
                alt="NuDesk Logo" 
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-gray-900 italic uppercase">NuDesk</h1>
          <p className="text-[#9CA3AF] font-medium">실무 참여형 스마트 관리 시스템</p>
        </div>

        <Card className="border-none shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="space-y-3 p-10 pb-5">
            <CardTitle className="text-3xl font-black tracking-tighter italic">로그인</CardTitle>
            <CardDescription className="font-bold text-[#9CA3AF]">
              시스템 이용을 위해 아이디와 비밀번호를 입력하세요.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-6 p-10 pt-0">
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-sm font-black text-zinc-700 ml-1">아이디</Label>
                <div className="relative">
                  <User className="absolute left-5 top-5 h-4 w-4 text-[#9CA3AF]" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="아이디를 입력하세요"
                    className="h-14 pl-12 rounded-2xl border-zinc-200 focus:ring-zinc-900 font-medium"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-black text-zinc-700 ml-1">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-5 top-5 h-4 w-4 text-[#9CA3AF]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-14 pl-12 rounded-2xl border-zinc-200 focus:ring-zinc-900 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-10 pt-0">
              <Button className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg shadow-xl shadow-zinc-200 transition-all active:scale-95" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    인증 중...
                  </>
                ) : (
                  '시작하기'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="mt-8 text-center text-sm text-[#9CA3AF]">
          계정이 없으신가요? <span className="text-primary font-semibold cursor-pointer hover:underline">관리자에게 문의하세요</span>
        </p>
      </div>
    </div>
  )
}
