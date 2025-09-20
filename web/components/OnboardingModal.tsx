"use client"
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

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
      <DialogContent className="max-w-md">
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
              <Input value={invite} onChange={(e) => setInvite(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>{loading ? '参加中...' : '参加する'}</Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">世帯名</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>{loading ? '作成中...' : '作成する'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

