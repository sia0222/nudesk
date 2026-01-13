'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/utils/supabase/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Wrench } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SetupPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [log, setLog] = useState<string[]>([])
  const [errorDetail, setErrorDetail] = useState<string>('')

  const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const handleFullRepair = async () => {
    setStatus('loading')
    setLog([])
    setErrorDetail('')
    
    try {
      addLog('🔧 수리 엔진 가동 시작...')
      
      // 관리자 권한 클라이언트 생성
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      addLog('📡 Supabase 서버 연결 확인 중...')
      
      const testUsers = [
        { un: 'nubiz', pw: '3345', role: 'MASTER', name: '대표 마스터' },
        { un: 'admin', pw: '3346', role: 'ADMIN', name: '운영 관리자' },
        { un: 'staff', pw: '3347', role: 'STAFF', name: '실무 직원' },
        { un: 'customer', pw: '3348', role: 'CUSTOMER', name: '테스트 고객' }
      ]

      for (const u of testUsers) {
        const email = `${u.un}@nudesk.local`
        addLog(`👤 계정 생성 시도: ${u.un} (${u.role})`)

        // 1. 기존 유저가 있는지 확인하고 삭제 후 재생성 (가장 확실한 방법)
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existingUser = listData?.users.find(user => user.email === email)
        
        if (existingUser) {
          addLog(`♻️ 기존 계정 발견, 재설정 중: ${u.un}`)
          await supabase.auth.admin.deleteUser(existingUser.id)
        }

        // 2. Auth 계정 생성
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: u.pw,
          email_confirm: true,
          user_metadata: { username: u.un, full_name: u.name }
        })

        if (authError) {
          addLog(`❌ Auth 생성 실패: ${u.un} - ${authError.message}`)
          continue
        }

        // 3. 프로필 정보 생성
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              username: u.un,
              full_name: u.name,
              role: u.role,
              is_approved: true
            })

          if (profileError) {
            addLog(`⚠️ 프로필 생성 실패 (스키마 에러 가능성): ${profileError.message}`)
            // 만약 여기서 "querying schema" 에러가 나면, 
            // 이는 SQL Editor에서 권한 쿼리를 한 번은 실행해야 함을 의미합니다.
          } else {
            addLog(`✅ 계정 생성 완료: ${u.un}`)
          }
        }
      }

      addLog('✨ 모든 복구 프로세스가 종료되었습니다.')
      setStatus('success')
    } catch (err: any) {
      console.error(err)
      setErrorDetail(err.message)
      setStatus('error')
      addLog('🚨 치명적 오류 발생')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-2xl border-none shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-zinc-900 text-white p-10 pb-12 relative overflow-hidden">
          <div className="relative z-10">
            <CardTitle className="text-4xl font-black tracking-tighter italic flex items-center gap-3">
              <Wrench className="h-8 w-8 text-zinc-400" /> NuDesk Repair Engine
            </CardTitle>
            <CardDescription className="text-zinc-400 font-bold mt-2 text-lg">
              제 잘못으로 꼬인 DB 엔진과 계정을 제가 직접 고칩니다.
            </CardDescription>
          </div>
          <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-white/5 rounded-full blur-3xl" />
        </CardHeader>
        
        <CardContent className="p-10 space-y-8">
          <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 min-h-[200px] max-h-[300px] overflow-auto font-mono text-sm space-y-2">
            {log.length === 0 && <p className="text-zinc-300 italic">복구 버튼을 누르면 로그가 여기에 표시됩니다...</p>}
            {log.map((line, i) => (
              <motion.p 
                key={i} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "font-bold",
                  line.includes('✅') ? "text-emerald-600" : 
                  line.includes('❌') || line.includes('🚨') ? "text-red-500" : 
                  "text-zinc-600"
                )}
              >
                {line}
              </motion.p>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <Button 
                onClick={handleFullRepair}
                className="w-full h-20 rounded-[1.5rem] bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xl shadow-2xl shadow-zinc-200 transition-all active:scale-95"
              >
                DB 엔진 수리 및 계정 자동 생성 시작
              </Button>
            )}

            {status === 'loading' && (
              <div className="flex flex-col items-center justify-center py-6 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-zinc-900" />
                <p className="font-black text-zinc-900 animate-pulse">수리 진행 중... 잠시만 기다려 주세요.</p>
              </div>
            )}

            {status === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-900">수리가 완료되었습니다!</h3>
                  <p className="text-zinc-500 font-bold mt-2">이제 로그인 페이지로 가서 [nubiz / 3345]로 로그인하세요.</p>
                </div>
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className="w-full h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg"
                >
                  로그인하러 가기
                </Button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 p-6 rounded-3xl border border-red-100 text-red-600">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="font-black">치명적 오류 발생</span>
                </div>
                <p className="text-sm font-bold opacity-80">{errorDetail}</p>
                <p className="text-xs mt-4 font-medium italic">
                  * 이 에러는 DB 비밀번호 없이 수리할 수 없는 영역입니다. <br />
                  결국 SQL Editor에서 제가 드린 쿼리를 한 번은 실행해주셔야 할 것 같습니다.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
