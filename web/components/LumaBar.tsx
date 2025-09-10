"use client"
import * as React from "react"
import { Home, Bell, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type LumaBarProps = {
  current?: "home" | "alerts" | "settings"
  onNavigate?: (to: NonNullable<LumaBarProps["current"]>) => void
  className?: string
}

export default function LumaBar({ current = "home", onNavigate, className }: LumaBarProps) {
  const Item = (
    props: {
      id: NonNullable<LumaBarProps["current"]>
      icon: React.ReactNode
      label: string
    },
  ) => (
    <button
      aria-label={props.label}
      aria-current={current === props.id ? "page" : undefined}
      onClick={() => onNavigate?.(props.id)}
      className={cn(
        "flex size-14 items-center justify-center rounded-full bg-background text-foreground border",
        current === props.id ? "shadow-md" : "opacity-80 hover:opacity-100",
      )}
    >
      {props.icon}
    </button>
  )

  return (
    <nav className={cn("fixed bottom-6 left-1/2 z-50 -translate-x-1/2", className)} aria-label="メインナビゲーション">
      <div className="flex items-center gap-4 rounded-full border bg-card px-4 py-3 shadow-lg">
        <Item id="home" icon={<Home className="size-5" />} label="ホーム" />
        <Item id="alerts" icon={<Bell className="size-5" />} label="通知" />
        <Item id="settings" icon={<Settings className="size-5" />} label="設定" />
      </div>
    </nav>
  )
}

