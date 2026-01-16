import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
  leftElement?: React.ReactNode
  iconClassName?: string
}

export function PageHeader({ 
  icon: Icon, 
  title, 
  description, 
  children,
  leftElement,
  iconClassName 
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-6">
        {leftElement && (
          <div className="flex items-center">
            {leftElement}
          </div>
        )}
        {Icon && (
          <div className={cn(
            "h-16 w-16 rounded-3xl bg-zinc-900 text-white flex items-center justify-center shadow-xl shadow-zinc-100 transition-transform hover:scale-105 duration-300",
            iconClassName
          )}>
            <Icon className="h-8 w-8" />
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tighter text-zinc-900 italic uppercase">
            {title}
          </h1>
          {description && (
            <p className="text-[#9CA3AF] text-sm font-bold tracking-tight italic">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
