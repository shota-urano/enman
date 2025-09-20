"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Select from "@/components/ui/select"
import AppHeader from "@/components/AppHeader"

type Category = {
  id: string
  name: string
  type: "income" | "expense"
  sort_order: number | null
}

type Account = {
  id: string
  name: string
  sort_order: number | null
}

export default function SettingsPage() {
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingMasters, setLoadingMasters] = useState(false)

  // Members approval
  const [members, setMembers] = useState<Array<{ user_id: string; role: 'owner' | 'member'; approved: boolean; joined_at: string | null; created_at: string }>>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  // New master inputs
  const [catName, setCatName] = useState("")
  const [catType, setCatType] = useState<"income" | "expense">("expense")
  const [accName, setAccName] = useState("")

  // Closing day (UI only placeholder for now)
  const [closingDay, setClosingDay] = useState<string>("31")
  const days = useMemo(() => Array.from({ length: 31 }).map((_, i) => String(i + 1)), [])

  useEffect(() => {
    const load = async () => {
      setLoadingMasters(true)
      try {
        const [catsRes, accsRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/accounts", { cache: "no-store" }),
        ])
        if (catsRes.ok) setCategories(await catsRes.json())
        if (accsRes.ok) setAccounts(await accsRes.json())
      } finally {
        setLoadingMasters(false)
      }
    }
    load()
  }, [])

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true)
      setMemberError(null)
      try {
        const res = await fetch('/api/households/members', { cache: 'no-store' })
        if (!res.ok) throw new Error('failed to load members')
        const list = await res.json()
        setMembers(Array.isArray(list) ? list : [])
      } catch (e: unknown) {
        setMemberError(e instanceof Error ? e.message : 'load error')
      } finally {
        setLoadingMembers(false)
      }
    }
    loadMembers()
  }, [])

  const toggleApprove = async (userId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/households/members/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      if (!res.ok) throw new Error('update failed')
      const updated = await res.json()
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? updated : m)))
    } catch (e) {
      alert('承認の更新に失敗しました')
    }
  }

  const createInvite = async () => {
    setLoadingInvite(true)
    try {
      const res = await fetch("/api/households/invite", { method: "POST" })
      if (!res.ok) throw new Error("Failed to create invite")
      const data = await res.json()
      // expecting { token: string }
      setInviteToken(data?.token ?? null)
    } catch (e) {
      console.error(e)
      setInviteToken(null)
      alert("招待コードの発行に失敗しました")
    } finally {
      setLoadingInvite(false)
    }
  }

  const copyInvite = async () => {
    if (!inviteToken) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteToken)
        alert("招待コードをコピーしました")
      } else {
        // Fallback for older browsers
        const ta = document.createElement("textarea")
        ta.value = inviteToken
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
        alert("招待コードをコピーしました")
      }
    } catch (e) {
      console.error(e)
      alert("コピーに失敗しました")
    }
  }

  const createCategory = async () => {
    if (!catName.trim()) return
    // sort_order はサーバ側でデフォルト0。nullを送るとバリデーションエラーになるため送らない。
    const payload = { name: catName.trim(), type: catType }
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      alert("カテゴリ作成に失敗しました")
      return
    }
    setCatName("")
    // reload
    const cats = await fetch("/api/categories", { cache: "no-store" }).then(r => r.json())
    setCategories(cats)
  }

  const updateCategoryName = async (id: string, name: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      alert("カテゴリ更新に失敗しました")
      return
    }
    const cats = await fetch("/api/categories", { cache: "no-store" }).then(r => r.json())
    setCategories(cats)
  }

  const createAccount = async () => {
    if (!accName.trim()) return
    // アカウント種別はUI未実装のため既定で 'cash' を付与。
    // sort_order はサーバ側デフォルトに任せる。
    const payload = { name: accName.trim(), type: 'cash' as const }
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      alert("アカウント作成に失敗しました")
      return
    }
    setAccName("")
    const accs = await fetch("/api/accounts", { cache: "no-store" }).then(r => r.json())
    setAccounts(accs)
  }

  const updateAccountName = async (id: string, name: string) => {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      alert("アカウント更新に失敗しました")
      return
    }
    const accs = await fetch("/api/accounts", { cache: "no-store" }).then(r => r.json())
    setAccounts(accs)
  }

  const onSaveClosingDay = async () => {
    // NOTE: API未定のためダミー。実装後に household 更新API へ差し替え。
    alert(`締め日 ${closingDay} 日の保存は後続タスクで実装します`)
  }

  return (
    <main>
      <AppHeader
        title="設定"
        right={<Link href="/"><Button variant="secondary" className="h-9">ホーム</Button></Link>}
      />
      <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-8">

      {/* Closing day */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-medium">締め日</h2>
        <div className="flex items-center gap-3">
          <Select
            className="w-24"
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
          >
            {days.map((d) => (
              <option key={d} value={d}>{d}日</option>
            ))}
          </Select>
          <Button onClick={onSaveClosingDay}>保存</Button>
        </div>
        <p className="text-xs text-muted-foreground">※ Householdの締め日APIは別タスクで実装予定</p>
      </Card>

      {/* Masters */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-medium">カテゴリ（マスター）</h2>
          <div className="flex gap-2">
            <Input
              placeholder="カテゴリ名"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
            <Select
              className="w-32"
              value={catType}
              onChange={(e) => setCatType(e.target.value as "income" | "expense")}
            >
              <option value="expense">支出</option>
              <option value="income">収入</option>
            </Select>
            <Button onClick={createCategory}>追加</Button>
          </div>
          <div className="space-y-2">
            {loadingMasters ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">カテゴリがありません</p>
            ) : (
              categories
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Input defaultValue={c.name} onBlur={(e) => updateCategoryName(c.id, e.target.value)} />
                    <span className="text-xs text-muted-foreground w-16 text-right">{c.type === "expense" ? "支出" : "収入"}</span>
                  </div>
                ))
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-medium">アカウント（マスター）</h2>
          <div className="flex gap-2">
            <Input
              placeholder="アカウント名"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
            />
            <Button onClick={createAccount}>追加</Button>
          </div>
          <div className="space-y-2">
            {loadingMasters ? (
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">アカウントがありません</p>
            ) : (
              accounts
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Input defaultValue={a.name} onBlur={(e) => updateAccountName(a.id, e.target.value)} />
                  </div>
                ))
            )}
          </div>
        </Card>
      </section>

      {/* Invite */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-medium">招待コード</h2>
        <div className="flex items-center gap-2">
          <Button onClick={createInvite} disabled={loadingInvite}>
            {loadingInvite ? "発行中..." : "招待コードを発行"}
          </Button>
          {inviteToken && <Input readOnly value={inviteToken} />}
          {inviteToken && (
            <Button variant="secondary" onClick={copyInvite}>
              コピー
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">発行済みコードは一定時間で無効になります。</p>
      </Card>

      {/* Members Approval */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-medium">メンバー承認</h2>
        {memberError && <p className="text-sm text-red-600" role="alert">{memberError}</p>}
        {loadingMembers ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">メンバーがいません</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.user_id}</div>
                  <div className="text-xs text-muted-foreground">{m.role === 'owner' ? 'オーナー' : 'メンバー'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{m.approved ? '承認済み' : '未承認'}</span>
                  <Button
                    variant={m.approved ? 'secondary' : 'default'}
                    onClick={() => toggleApprove(m.user_id, !m.approved)}
                    className="h-8"
                  >
                    {m.approved ? '承認を取り消す' : '承認する'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">オーナーのみ操作できます。</p>
      </Card>
      </div>
    </main>
  )
}

