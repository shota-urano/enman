"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabaseBrowser"
import { useToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// Bubble SVG Components
const BubbleDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large bubbles - より濃い色で視認性向上 */}
    <div className="absolute top-16 right-8 w-12 h-12 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#FADADD80', 
      borderColor: '#FADADD', 
      animationDelay: '0s', 
      animationDuration: '3s' 
    }} />
    <div className="absolute top-32 left-12 w-6 h-6 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#CFE8F780', 
      borderColor: '#CFE8F7', 
      animationDelay: '1s', 
      animationDuration: '2.5s' 
    }} />
    <div className="absolute top-24 right-20 w-4 h-4 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#FFF4C280', 
      borderColor: '#FFF4C2', 
      animationDelay: '0.5s', 
      animationDuration: '2s' 
    }} />
    
    {/* Medium bubbles - より濃い色で視認性向上 */}
    <div className="absolute top-48 left-8 w-8 h-8 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#CFE8F770', 
      borderColor: '#CFE8F7', 
      animationDelay: '1.5s', 
      animationDuration: '3.5s' 
    }} />
    <div className="absolute top-40 right-32 w-5 h-5 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#FADADD75', 
      borderColor: '#FADADD', 
      animationDelay: '2s', 
      animationDuration: '2.8s' 
    }} />
    
    {/* Small bubbles - より濃い色で視認性向上 */}
    <div className="absolute top-20 left-24 w-3 h-3 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#FFF4C285', 
      borderColor: '#FFF4C2', 
      animationDelay: '0.8s', 
      animationDuration: '2.2s' 
    }} />
    <div className="absolute top-36 right-16 w-2 h-2 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#FADADD90', 
      borderColor: '#FADADD', 
      animationDelay: '1.2s', 
      animationDuration: '1.8s' 
    }} />
    <div className="absolute top-52 left-20 w-3 h-3 rounded-full animate-pulse border" style={{ 
      backgroundColor: '#CFE8F775', 
      borderColor: '#CFE8F7', 
      animationDelay: '2.5s', 
      animationDuration: '3.2s' 
    }} />
    
    {/* Floating animation bubbles - より濃い色 */}
    <div className="absolute bottom-40 left-4 w-7 h-7 rounded-full border" style={{ 
      backgroundColor: '#FADADD60',
      borderColor: '#FADADD',
      animation: 'float 4s ease-in-out infinite', 
      animationDelay: '0s' 
    }} />
    <div className="absolute bottom-32 right-6 w-5 h-5 rounded-full border" style={{ 
      backgroundColor: '#CFE8F770',
      borderColor: '#CFE8F7',
      animation: 'float 3s ease-in-out infinite', 
      animationDelay: '1s' 
    }} />
    <div className="absolute bottom-48 right-24 w-4 h-4 rounded-full border" style={{ 
      backgroundColor: '#FFF4C280',
      borderColor: '#FFF4C2',
      animation: 'float 3.5s ease-in-out infinite', 
      animationDelay: '0.5s' 
    }} />
    
    <style jsx>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `}</style>
  </div>
)

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
      const { data, error } = await fn
      if (error) throw error
      // Best-effort: immediately expose access token to server via cookie so API routes can authenticate
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
      show(mode === "signin" ? "サインイン成功" : "サインアップ成功", "success")
      // Reset any iOS zoom state before leaving the auth page so the next screen renders at normal scale
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
      // Go to home; onboarding modal will handle first-login setup
      router.replace("/")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "認証エラーが発生しました"
      show(message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-[100dvh] flex flex-col overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #CFE8F7 0%, #FADADD 50%, #FFF4C2 100%)' }}
    >
      {/* Auth page only: remove global bottom padding to avoid scroll */}
      <style dangerouslySetInnerHTML={{ __html: "body{padding-bottom:0!important}" }} />
      
      {/* Bubble decorations */}
      <BubbleDecoration />
      {/* Upper section */}
      <section className="h-[40dvh] flex items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-md text-center">
          <div className="text-3xl font-bold mb-2" style={{ color: '#8B5A3C' }}>
            Hello!
          </div>
          <div className="text-lg font-medium mb-2" style={{ color: '#6B7280' }}>
            Welcome to enman
          </div>
          <div className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
            {mode === "signin" ? "続けるにはメールとパスワードを入力してください" : "まずはメールとパスワードを登録しましょう"}
          </div>
        </div>
      </section>

      {/* Lower sheet (stick to bottom, content centered, corners follow page gradient) */}
      <section className="w-full h-[60dvh] rounded-t-3xl border bg-card shadow-[0_-6px_24px_rgba(0,0,0,0.06)] px-4 pt-6 flex flex-col">
        <div className="flex-1 flex pt-4">
          <div className="mx-auto w-full max-w-md">
          {/* Segmented control */}
          <div className="mb-4">
            <div className="inline-flex w-full rounded-full p-1" style={{ backgroundColor: '#ECECEC', border: '1px solid #CFE8F7' }}>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 h-10 rounded-full text-sm transition font-medium ${
                  mode === "signin" 
                    ? "shadow-sm" 
                    : "text-gray-600 hover:bg-white/50"
                }`}
                style={mode === "signin" ? { 
                  backgroundColor: '#FADADD', 
                  color: '#4A5568' // ダークグレーで視認性向上
                } : {}}
              >
                サインイン
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 h-10 rounded-full text-sm transition font-medium ${
                  mode === "signup" 
                    ? "shadow-sm" 
                    : "text-gray-600 hover:bg-white/50"
                }`}
                style={mode === "signup" ? { 
                  backgroundColor: '#FADADD', 
                  color: '#4A5568' // ダークグレーで視認性向上
                } : {}}
              >
                サインアップ
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">メールアドレス</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm">パスワード</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="w-full font-medium shadow-sm hover:shadow-md transition-all duration-200" 
              style={{ 
                backgroundColor: '#FADADD',
                color: '#4A5568' // ダークグレーで視認性向上
              }}
              disabled={loading}
              onMouseEnter={(e) => {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#F8B4B7';
                target.style.color = '#2D3748'; // ホバー時はより濃いグレー
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#FADADD';
                target.style.color = '#4A5568';
              }}
            >
              {loading ? "処理中..." : mode === "signin" ? "サインイン" : "サインアップ"}
            </Button>
          </form>
          <div className="mt-3 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <button className="underline underline-offset-2" onClick={() => setMode("signup")}>アカウントをお持ちでない方はこちら</button>
            ) : (
              <button className="underline underline-offset-2" onClick={() => setMode("signin")}>すでにアカウントをお持ちの方はこちら</button>
            )}
          </div>
          </div>
        </div>
      </section>
    </main>
  )
}
