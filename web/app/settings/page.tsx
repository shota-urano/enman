"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
      alert("招待リンクの発行に失敗しました")
    } finally {
      setLoadingInvite(false)
    }
  }

  const createCategory = async () => {
    if (!catName.trim()) return
    const payload = { name: catName.trim(), type: catType, sort_order: null as number | null }
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
    const payload = { name: accName.trim(), sort_order: null as number | null }
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
    <main className="container mx-auto max-w-5xl p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">設定</h1>
        <Link href="/">
          <Button variant="secondary">ホームへ戻る</Button>
        </Link>
      </header>

      {/* Closing day */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-medium">締め日</h2>
        <div className="flex items-center gap-3">
          <Select value={closingDay} onValueChange={setClosingDay}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="日付" />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d} value={d}>{d}日</SelectItem>
              ))}
            </SelectContent>
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
            <Select value={catType} onValueChange={(v) => setCatType(v as "income" | "expense") }>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="income">収入</SelectItem>
              </SelectContent>
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
        <h2 className="text-lg font-medium">招待リンク</h2>
        <div className="flex items-center gap-2">
          <Button onClick={createInvite} disabled={loadingInvite}>
            {loadingInvite ? "発行中..." : "招待リンクを発行"}
          </Button>
          {inviteToken && (
            <Input readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/households/join?token=${inviteToken}`} />
          )}
        </div>
        <p className="text-xs text-muted-foreground">発行済みトークンは一定時間で無効になります。</p>
      </Card>
    </main>
  )
}

