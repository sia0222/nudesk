import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("max-w-[1200px] mx-auto px-4 md:px-0 py-10 space-y-10", className)}>
      {children}
    </div>
  )
}
