"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createSupabaseBrowser } from '@/lib/supabaseBrowser'

type BootstrapResponse = { needs_onboarding: boolean }

async function getNeedsOnboarding(): Promise<boolean> {
  const res = await fetch('/api/bootstrap', { cache: 'no-store' })
  if (!res.ok) return false
  const json = (await res.json().catch(() => ({}))) as Partial<BootstrapResponse>
  return Boolean(json.needs_onboarding)
}

async function postOnboarding(body: { invite_token?: string; household_name?: string }) {
  const res = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (json && json.message) || `オンボーディングに失敗しました (${res.status})`
    throw new Error(msg)
  }
  return json as { action: 'joined' | 'created' | 'noop'; household_id: string }
}

export default function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'invite' | 'create'>('invite')
  const [invite, setInvite] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const { show } = useToast()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/auth')) {
      setOpen(false)
      return
    }
    let mounted = true
    async function checkInitialSession() {
      try {
        const supabase = createSupabaseBrowser()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!mounted || !token) return
        const needs = await getNeedsOnboarding()
        if (mounted && needs) setOpen(true)
      } catch {
        // no-op: missing Supabase config or network error while logged out
      }
    }
    checkInitialSession()
    return () => {
      mounted = false
    }
  }, [pathname])

  // Re-check when auth state changes (e.g. sign-in/up completes without full reload)
  useEffect(() => {
    if (!pathname || pathname.startsWith('/auth')) return
    let unsub: (() => void) | undefined
    try {
      const supabase = createSupabaseBrowser()
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // When a valid session appears, re-check onboarding state
        if (session?.access_token) {
          // slight delay to ensure cookie sync completes
          setTimeout(() => {
            getNeedsOnboarding().then((needs) => {
              if (needs) setOpen(true)
            })
          }, 200)
        }
      })
      unsub = () => data.subscription.unsubscribe()
    } catch {
      // no-op: if env missing in development, avoid crashing
    }
    return () => {
      if (unsub) unsub()
    }
  }, [pathname])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body =
        mode === 'invite'
          ? { invite_token: invite.trim() || undefined }
          : { household_name: name.trim() || undefined }
      const result = await postOnboarding(body)
      const msg = result.action === 'joined' ? '世帯に参加しました' : result.action === 'created' ? '世帯を作成しました' : 'セットアップ済みです'
      show(msg, 'success')
      setOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'セットアップに失敗しました'
      show(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open || pathname?.startsWith('/auth')) return null

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent className="mx-4 w-[min(92vw,30rem)] max-w-lg px-8 pb-8 pt-7">
        <DialogHeader>
          <div>
            <h3 className="text-lg font-semibold text-foreground">はじめに</h3>
            <p className="mt-1 text-sm text-muted-foreground">招待コードで世帯に参加するか、新しく世帯を作成してください</p>
          </div>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="mb-6 inline-flex w-full items-center justify-center gap-1 rounded-[999px] border border-white/60 bg-white/70 p-1 shadow-neumorphic-soft">
          <button
            type="button"
            onClick={() => setMode('invite')}
            className={`flex-1 rounded-[999px] px-4 py-2 text-sm font-medium transition-all ${
              mode === 'invite'
                ? 'bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(223,228,240,0.9)] text-foreground shadow-neumorphic-soft'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            招待あり
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 rounded-[999px] px-4 py-2 text-sm font-medium transition-all ${
              mode === 'create'
                ? 'bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(223,228,240,0.9)] text-foreground shadow-neumorphic-soft'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            招待なし
          </button>
        </div>

        {/* Forms */}
        {mode === 'invite' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">招待コード</label>
              <Input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                placeholder="ABCD-1234 など"
                aria-label="招待コード"
                autoComplete="off"
                required
              />
              <p className="mt-2 text-xs text-muted-foreground">メールやチャットで共有されたコードを入力してください</p>
            </div>
            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? '参加中...' : '参加する'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">世帯名</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 田中家"
                aria-label="世帯名"
                autoComplete="off"
                required
              />
              <p className="mt-2 text-xs text-muted-foreground">あとから設定で変更できます</p>
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? '作成中...' : '作成する'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

