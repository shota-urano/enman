"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export type AppHeaderProps = {
  title?: string
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export default function AppHeader({ title, left, right, className }: AppHeaderProps) {
  return (
    <div className={cn(
      "sticky top-0 inset-x-0 z-40",
      className,
    )}>
      <div className="h-[env(safe-area-inset-top)]" aria-hidden />
      <div className={cn(
        "mx-4 mb-4 flex h-14 items-center gap-3 rounded-[28px] border border-white/60 px-4 shadow-neumorphic backdrop-blur-md md:mx-6 md:h-16 md:px-6",
        "bg-surface-neumorphic",
      )}>
        <div className="min-w-10 flex items-center justify-start">{left}</div>
        <div className="flex-1 truncate text-center text-base font-semibold text-foreground md:text-lg">
          {title}
        </div>
        <div className="min-w-10 flex items-center justify-end gap-1">{right}</div>
      </div>
    </div>
  )
}

