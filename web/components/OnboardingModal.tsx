"use client"
import { useEffect, useState } from 'react'
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
    const msg = (json && json.message) || `Onboarding failed (${res.status})`
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
  const { show } = useToast()

  useEffect(() => {
    let mounted = true
    getNeedsOnboarding().then((needs) => {
      if (mounted && needs) setOpen(true)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Re-check when auth state changes (e.g. sign-in/up completes without full reload)
  useEffect(() => {
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
  }, [])

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

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent className="max-w-md w-[min(92vw,28rem)] mx-4 p-6 pb-7">
        <DialogHeader>
          <h3 className="text-lg font-semibold">はじめに</h3>
          <p className="text-sm text-muted-foreground">招待コードで世帯に参加するか、新しく世帯を作成してください</p>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="inline-flex rounded-full p-1 mb-4 border">
          <button
            type="button"
            onClick={() => setMode('invite')}
            className={`px-4 py-2 text-sm rounded-full ${mode === 'invite' ? 'bg-card shadow-sm' : 'text-gray-600'}`}
          >
            招待あり
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`px-4 py-2 text-sm rounded-full ${mode === 'create' ? 'bg-card shadow-sm' : 'text-gray-600'}`}
          >
            招待なし
          </button>
        </div>

        {/* Forms */}
        {mode === 'invite' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">招待コード</label>
              <div className="rounded-xl border border-black/10 bg-white shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow px-3 py-2">
                <Input
                  className="bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="ABCD-1234 など"
                  aria-label="招待コード"
                  autoComplete="off"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">メールやチャットで共有されたコードを入力してください</p>
            </div>
            <Button type="submit" disabled={loading} className="mt-1 w-full">{loading ? '参加中...' : '参加する'}</Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">世帯名</label>
              <div className="rounded-xl border border-black/10 bg-white shadow-sm hover:shadow-md focus-within:shadow-md transition-shadow px-3 py-2">
                <Input
                  className="bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 田中家"
                  aria-label="世帯名"
                  autoComplete="off"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">あとから設定で変更できます</p>
            </div>
            <Button type="submit" disabled={loading} className="mt-1">{loading ? '作成中...' : '作成する'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

