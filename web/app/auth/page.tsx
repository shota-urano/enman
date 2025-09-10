"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabaseBrowser"
import { useToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { show } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createSupabaseBrowser()
      const fn =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password })
      const { error } = await fn
      if (error) throw error
      show(mode === "signin" ? "サインイン成功" : "サインアップ成功", "success")
      router.replace("/setup")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "認証エラーが発生しました"
      show(message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">{mode === "signin" ? "サインイン" : "サインアップ"}</h1>
      <div className="mb-4 space-x-2">
        <Button variant={mode === "signin" ? "default" : "secondary"} onClick={() => setMode("signin")}>サインイン</Button>
        <Button variant={mode === "signup" ? "default" : "secondary"} onClick={() => setMode("signup")}>サインアップ</Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">メールアドレス</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm">パスワード</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "処理中..." : mode === "signin" ? "サインイン" : "サインアップ"}
        </Button>
      </form>
    </main>
  )
}

