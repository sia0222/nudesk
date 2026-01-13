'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-2xl mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900">NuDesk</h1>
          <p className="text-gray-600 font-medium">실무 참여형 스마트 관리 시스템</p>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:bg-zinc-900/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">로그인</CardTitle>
            <CardDescription>
              시스템 이용을 위해 아이디와 비밀번호를 입력하세요.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">아이디</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="아이디를 입력하세요"
                    className="pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button className="w-full h-11 text-base font-semibold" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    인증 중...
                  </>
                ) : (
                  '시작하기'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="mt-8 text-center text-sm text-zinc-500">
          계정이 없으신가요? <span className="text-primary font-semibold cursor-pointer hover:underline">관리자에게 문의하세요</span>
        </p>
      </div>
    </div>
  )
}
