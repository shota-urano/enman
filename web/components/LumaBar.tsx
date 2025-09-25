"use client"
import * as React from "react"
import { Bell, Settings, CalendarDays, BarChart3, Repeat, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type LumaBarProps = {
  current?: "calendar" | "reports" | "subscriptions" | "new" | "alerts" | "settings"
  onNavigate?: (to: NonNullable<LumaBarProps["current"]>) => void
  className?: string
  badges?: Partial<Record<NonNullable<LumaBarProps["current"]>, number>>
}

export default function LumaBar({ current = "calendar", onNavigate, className, badges }: LumaBarProps) {
  const Item = (
    props: {
      id: NonNullable<LumaBarProps["current"]>
      icon: React.ReactNode
      label: string
      prominent?: boolean
    },
  ) => (
    <button
      aria-label={props.label}
      aria-current={current === props.id ? "page" : undefined}
      onClick={() => onNavigate?.(props.id)}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-[28px] text-foreground transition-all duration-200",
        props.prominent
          ? "h-16 w-16 md:h-[72px] md:w-[72px]"
          : "h-12 w-12 md:h-14 md:w-14",
        current === props.id
          ? "bg-gradient-to-br from-[rgba(255,163,179,1)] via-[rgba(255,143,162,0.95)] to-[rgba(255,120,148,0.9)] text-white shadow-neumorphic-hover"
          : "bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(226,231,242,0.9)] text-foreground/85 shadow-neumorphic-soft hover:shadow-neumorphic-hover hover:-translate-y-[2px]",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center",
          current === props.id ? "text-white" : "text-muted-foreground",
        )}
      >
        {props.icon}
      </span>
      <span
        className={cn(
          // smaller label and prevent wrapping
          "mt-0.5 text-[9px] md:text-[10px] leading-none whitespace-nowrap",
          current === props.id ? "text-white/95" : "text-muted-foreground",
        )}
      >
        {props.label}
      </span>
      {props.id === "alerts" && (badges?.alerts ?? 0) > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(255,163,179,1)] to-[rgba(255,120,148,0.9)] px-1 text-[10px] font-medium text-white shadow-neumorphic-soft">
          {Math.min(badges!.alerts!, 99)}
        </span>
      )}
    </button>
  )

  return (
    <nav
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      aria-label="メインナビゲーション"
    >
      <div className="bg-surface-neumorphic mx-auto flex w-full max-w-[740px] items-center rounded-[38px] border border-white/60 px-3 py-3 shadow-neumorphic backdrop-blur-lg md:px-5">
        {/* Split navigation into groups to keep spacing balanced without the old home tab */}
        <div className="flex w-full items-center gap-3 md:gap-4">
          <div className="flex basis-0 flex-1 items-center justify-evenly gap-3 md:gap-4 min-w-fit">
            <Item id="calendar" icon={<CalendarDays className="size-5" />} label="カレンダー" />
            <Item id="reports" icon={<BarChart3 className="size-5" />} label="レポート" />
          </div>
          <Item id="new" icon={<Plus className="size-6" />} label="追加" prominent />
          <div className="flex basis-0 flex-1 items-center justify-evenly gap-3 md:gap-4 min-w-fit">
            <Item id="subscriptions" icon={<Repeat className="size-5" />} label="サブスク" />
            <Item id="alerts" icon={<Bell className="size-5" />} label="通知" />
            <Item id="settings" icon={<Settings className="size-5" />} label="設定" />
          </div>
        </div>
      </div>
    </nav>
  )
}

