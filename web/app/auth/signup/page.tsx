"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabaseBrowser"
import { useToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import BubbleDecoration from "@/components/auth/BubbleDecoration"
import UserAvatar from "@/components/UserAvatar"
import { Camera } from "lucide-react"
import {
  DEFAULT_PROFILE_NAME,
  PENDING_PROFILE_STORAGE_KEY,
} from "@/lib/profile"

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { show } = useToast()

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      show("表示名を入力してください", "error")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      show("パスワードが一致しません。もう一度同じ内容を入力してください", "error")
      setLoading(false)
      return
    }

    try {
      const supabase = createSupabaseBrowser()
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      const token = data.session?.access_token
      const expiresAt = data.session?.expires_at ?? null
      if (token) {
        let attrs = `Path=/; SameSite=Lax`
        if (expiresAt && Number.isFinite(expiresAt)) {
          const maxAge = Math.max(0, Math.floor(expiresAt - Date.now() / 1000))
          attrs = `Max-Age=${maxAge}; ` + attrs
        }
        document.cookie = `sb-access-token=${encodeURIComponent(token)}; ${attrs}`
      }

      if (typeof window !== "undefined") {
        const payload = {
          display_name: trimmedName,
        }
        window.localStorage.setItem(PENDING_PROFILE_STORAGE_KEY, JSON.stringify(payload))
      }

      if (token) {
        try {
          await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ display_name: trimmedName }),
          })
        } catch {
          // セッション未確立の場合は後で適用する
        }
        if (avatarFile) {
          try {
            const form = new FormData()
            form.append("file", avatarFile)
            await fetch("/api/profile/avatar", {
              method: "POST",
              body: form,
            })
          } catch (err) {
            console.error("初回アイコン設定に失敗しました", err)
          }
        }
      }

      show(
        "We've sent you a confirmation email. Please check your inbox and complete the verification process.",
        "success",
      )
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        const originalContent = viewport.getAttribute("content") ?? "width=device-width, initial-scale=1"
        viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1")
        window.setTimeout(() => {
          viewport.setAttribute("content", originalContent)
        }, 300)
      }
      router.replace("/auth/signup/confirmation")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "サインアップでエラーが発生しました"
      show(message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-[100dvh] flex flex-col overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #CFE8F7 0%, #FADADD 50%, #FFF4C2 100%)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: "body{padding-bottom:0!important}" }} />
      <BubbleDecoration />
      <section className="h-[40dvh] flex items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-md text-center">
          <div className="text-3xl font-bold mb-2" style={{ color: "#8B5A3C" }}>
            はじめまして
          </div>
          <div className="text-lg font-medium mb-2" style={{ color: "#6B7280" }}>
            enman に参加する準備をしましょう
          </div>
          <div className="text-sm mt-2" style={{ color: "#9CA3AF" }}>
            メールアドレスとパスワードを登録してアカウントを作成します
          </div>
        </div>
      </section>
      <section className="w-full h-[60dvh] rounded-t-3xl border bg-card shadow-[0_-6px_24px_rgba(0,0,0,0.06)] px-4 pt-6 flex flex-col">
        <div className="flex-1 flex pt-4">
          <div className="mx-auto w-full max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">表示名</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="家族に表示される名前"
                  maxLength={64}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">アイコン (任意)</label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      className="relative inline-flex items-center justify-center transition hover:opacity-90"
                      aria-label="アイコンを選択"
                      disabled={loading}
                    >
                      <UserAvatar
                        name={displayName || DEFAULT_PROFILE_NAME}
                        imageUrl={avatarPreview}
                        size="md"
                        className="pointer-events-none"
                      />
                      <span
                        className="absolute bottom-0 right-0 flex h-7 w-7 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full bg-black text-white shadow ring-2 ring-white/90"
                        aria-hidden
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        if (!file) {
                          setAvatarFile(null)
                          if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                          setAvatarPreview(null)
                          return
                        }
                        if (file.size > MAX_FILE_SIZE) {
                          show(`画像サイズは ${MAX_FILE_SIZE_MB}MB 以下にしてください`, "error")
                          event.target.value = ""
                          return
                        }
                        if (!file.type.startsWith("image/")) {
                          show("画像ファイルを選択してください", "error")
                          event.target.value = ""
                          return
                        }
                        if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                        const url = URL.createObjectURL(file)
                        setAvatarFile(file)
                        setAvatarPreview(url)
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    登録後もアカウント設定ページからいつでも変更できます。
                  </p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm">メールアドレス</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">パスワード</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">パスワード（確認）</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full font-medium shadow-sm hover:shadow-md transition-all duration-200"
                style={{
                  backgroundColor: "#FADADD",
                  color: "#4A5568",
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement
                  target.style.backgroundColor = "#F8B4B7"
                  target.style.color = "#2D3748"
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLElement
                  target.style.backgroundColor = "#FADADD"
                  target.style.color = "#4A5568"
                }}
              >
                {loading ? "処理中..." : "サインアップ"}
              </Button>
            </form>
            <div className="mt-3 text-center text-sm text-muted-foreground">
              すでにアカウントをお持ちの方は
              <Link href="/auth" className="underline underline-offset-2 ml-1">
                こちらからサインイン
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
