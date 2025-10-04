"use client"

import { memo } from "react"
import clsx from "clsx"
import { DEFAULT_PROFILE_NAME } from "@/lib/profile"

const SIZE_MAP = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
} satisfies Record<string, string>

export type UserAvatarProps = {
  name: string
  imageUrl?: string | null
  size?: keyof typeof SIZE_MAP
  className?: string
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return Array.from(DEFAULT_PROFILE_NAME)[0] ?? "な"
  return Array.from(trimmed)[0] ?? Array.from(DEFAULT_PROFILE_NAME)[0] ?? "な"
}

function UserAvatar({ name, imageUrl, size = "md", className }: UserAvatarProps) {
  const baseClass = clsx(
    "flex items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-white via-white/80 to-slate-100 text-slate-700 shadow-sm overflow-hidden",
    SIZE_MAP[size] ?? SIZE_MAP.md,
    className,
  )

  if (imageUrl) {
    return (
      <div className={baseClass} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  const display = getInitial(name)
  return (
    <div className={baseClass} aria-hidden>
      <span className="select-none">{display}</span>
    </div>
  )
}

export default memo(UserAvatar)
