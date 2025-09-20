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
        "flex items-center gap-3 px-4 h-14 md:h-16",
        "backdrop-blur-md bg-card/80 border-b border-border/60",
      )}>
        <div className="min-w-10 flex items-center justify-start">{left}</div>
        <div className="flex-1 text-center font-medium truncate">{title}</div>
        <div className="min-w-10 flex items-center justify-end gap-1">{right}</div>
      </div>
    </div>
  )
}

