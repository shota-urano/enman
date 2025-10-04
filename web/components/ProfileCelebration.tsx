"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import UserAvatar from "@/components/UserAvatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import {
  DEFAULT_PROFILE_NAME,
  PENDING_PROFILE_STORAGE_KEY,
  PROFILE_CELEBRATION_FLAG,
} from "@/lib/profile"

type ProfileShape = {
  display_name: string
  avatar_url: string | null
}

async function fetchProfile(): Promise<ProfileShape | null> {
  try {
    const res = await fetch("/api/profile", { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json().catch(() => ({}))
    const name = typeof data?.display_name === "string" && data.display_name.trim().length > 0
      ? data.display_name.trim()
      : DEFAULT_PROFILE_NAME
    const avatarUrl = typeof data?.avatar_url === "string" && data.avatar_url.trim().length > 0 ? data.avatar_url : null
    return { display_name: name, avatar_url: avatarUrl }
  } catch (err) {
    console.error("Failed to load profile", err)
    return null
  }
}

async function applyPendingProfile(): Promise<boolean> {
  if (typeof window === "undefined") return false
  const raw = window.localStorage.getItem(PENDING_PROFILE_STORAGE_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as Partial<{ display_name: string }>
    if (!parsed?.display_name || !parsed.display_name.trim()) {
      window.localStorage.removeItem(PENDING_PROFILE_STORAGE_KEY)
      return false
    }
    const body = JSON.stringify({
      display_name: parsed.display_name.trim(),
    })
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    })
    if (!res.ok) throw new Error(`Failed to apply pending profile (${res.status})`)
    window.localStorage.removeItem(PENDING_PROFILE_STORAGE_KEY)
    return true
  } catch (err) {
    console.error("Failed to apply pending profile", err)
    return false
  }
}

function markCelebrated() {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(PROFILE_CELEBRATION_FLAG, "1")
}

function hasCelebrated() {
  if (typeof window === "undefined") return true
  return window.sessionStorage.getItem(PROFILE_CELEBRATION_FLAG) === "1"
}

export default function ProfileCelebration() {
  const [profile, setProfile] = useState<ProfileShape>({
    display_name: DEFAULT_PROFILE_NAME,
    avatar_url: null,
  })
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!pathname || pathname.startsWith("/auth")) return

    let cancelled = false
    async function sync() {
      const pendingApplied = await applyPendingProfile()
      let current = await fetchProfile()
      if (!current && pendingApplied) {
        current = await fetchProfile()
      }
      if (!current) return
      if (cancelled) return
      setProfile(current)
      if (current.display_name !== DEFAULT_PROFILE_NAME) {
        markCelebrated()
      }
      if (current.display_name === DEFAULT_PROFILE_NAME && !hasCelebrated()) {
        setOpen(true)
      }
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [pathname])

  useEffect(() => {
    if (profile.display_name !== DEFAULT_PROFILE_NAME && open) {
      setOpen(false)
      markCelebrated()
    }
  }, [profile.display_name, open])

  if (pathname?.startsWith("/auth")) return null

  const handleClose = (next: boolean) => {
    setOpen(next)
    if (!next) markCelebrated()
  }

  const handleLater = () => {
    markCelebrated()
    setOpen(false)
  }

  const handleGoSettings = () => {
    markCelebrated()
    setOpen(false)
    router.push("/settings/account")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mx-4 w-[min(92vw,30rem)] max-w-lg px-8 pb-8 pt-7">
        <DialogHeader>
          <div>
            <h3 className="text-lg font-semibold text-foreground">アップデートのお知らせ 🎉</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              enman に名前とアイコンのカスタマイズ機能が追加されました。
            </p>
          </div>
        </DialogHeader>
        <div className="space-y-5 px-1 pt-4 text-sm leading-relaxed text-muted-foreground">
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#fef7ff] via-white to-[#eef6ff] px-4 py-3">
            <UserAvatar name={profile.display_name} imageUrl={profile.avatar_url} size="md" />
            <div className="space-y-1">
              <div className="font-medium text-foreground">待望のプロフィールが設定できます！</div>
              <p className="text-xs text-muted-foreground">
                まだ仮の名前「{DEFAULT_PROFILE_NAME}」になっているので、あなたらしい名前とアイコンを登録しましょう。
              </p>
            </div>
          </div>
          <p>
            設定ページから表示名とアイコンを変更すると、世帯メンバーの一覧や明細でもあなたの情報が素敵に表示されます。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGoSettings}>今すぐ設定する</Button>
            <Button variant="ghost" onClick={handleLater}>
              あとで
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
