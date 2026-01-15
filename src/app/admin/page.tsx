'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Settings, 
  ShieldCheck,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function AdminDashboardPage() {
  const adminMenus = [
    { 
      name: '전체 유저 관리', 
      desc: '시스템 내 모든 마스터, 관리자, 직원을 관리합니다.',
      href: '/admin/users', 
      icon: Users, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      name: '시스템 설정', 
      desc: '전역 서비스 설정 및 보안 옵션을 관리합니다.',
      href: '/admin/settings', 
      icon: Settings, 
      color: 'text-zinc-600', 
      bg: 'bg-zinc-50' 
    },
  ]

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-lg">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">시스템 관리</h1>
          <p className="text-muted-foreground">인력 배치 및 시스템 전역 설정을 관리합니다.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminMenus.map((menu, index) => (
          <motion.div
            key={menu.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={menu.href}>
              <Card className="hover:shadow-md transition-all cursor-pointer group h-full border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className={`${menu.bg} ${menu.color} p-3 rounded-xl`}>
                    <menu.icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                </CardHeader>
                <CardContent className="pt-4">
                  <CardTitle className="text-xl font-black mb-2 tracking-tight">{menu.name}</CardTitle>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed font-medium">
                    {menu.desc}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
