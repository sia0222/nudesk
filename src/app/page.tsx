'use client'

import { motion } from 'framer-motion'
import { Rocket, CheckCircle2, Package, Globe, Cpu } from 'lucide-react'

export default function Home() {
  const features = [
    { icon: <Cpu className="w-6 h-6" />, text: 'Next.js 15 (App Router)' },
    { icon: <Globe className="w-6 h-6" />, text: 'Tailwind CSS' },
    { icon: <Package className="w-6 h-6" />, text: 'shadcn/ui' },
    { icon: <CheckCircle2 className="w-6 h-6" />, text: 'TanStack Query' },
    { icon: <Rocket className="w-6 h-6" />, text: 'Framer Motion' },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
          NuDesk Project Initialized
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Next.js 프로젝트가 성공적으로 생성되었습니다.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
            >
              <div className="text-primary">{feature.icon}</div>
              <span className="font-medium">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <p className="text-sm text-muted-foreground">
            Supabase 설정은 <code className="rounded bg-muted px-1 py-0.5">src/lib/supabase.ts</code>에서 확인하실 수 있습니다.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
