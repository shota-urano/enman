"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import ConfirmDialog from "@/components/ConfirmDialog"

export type EditableTransaction = {
  id: string
  date: string
  type: "income" | "expense"
  amount: number
  category_id?: string | null
  account_id?: string | null
  place?: string | null
  memo?: string | null
}

export type TransactionEditDialogProps = {
  open: boolean
  transaction: EditableTransaction | null
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onDeleted: () => void
}

type Kind = "income" | "expense"

type Category = {
  id: string
  name: string
  type: Kind | "both"
}

type Account = {
  id: string
  name: string
  type: "cash" | "bank" | "card" | "other"
}

type Draft = {
  kind: Kind
  occurred_on: string
  amount: string
  category_id: string
  account_id: string
  place: string
  memo: string
}

const emptyDraft: Draft = {
  kind: "expense",
  occurred_on: "",
  amount: "",
  category_id: "",
  account_id: "",
  place: "",
  memo: "",
}

export default function TransactionEditDialog({
  open,
  transaction,
  onOpenChange,
  onUpdated,
  onDeleted,
}: TransactionEditDialogProps) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoadingOptions(true)
    Promise.all([
      fetch("/api/categories").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/accounts").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([categoriesJson, accountsJson]) => {
        if (!active) return
        setCategories(Array.isArray(categoriesJson) ? (categoriesJson as Category[]) : [])
        setAccounts(Array.isArray(accountsJson) ? (accountsJson as Account[]) : [])
      })
      .catch(() => {
        if (!active) return
        setCategories([])
        setAccounts([])
      })
      .finally(() => {
        if (active) setLoadingOptions(false)
      })
    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!open || !transaction) return
    setDraft({
      kind: transaction.type,
      occurred_on: transaction.date,
      amount: String(transaction.amount),
      category_id: transaction.category_id ?? "",
      account_id: transaction.account_id ?? "",
      place: transaction.place ?? "",
      memo: transaction.memo ?? "",
    })
    setError(null)
    setStatus(null)
  }, [open, transaction])

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === draft.kind || c.type === "both")
  }, [categories, draft.kind])

  const deleteDescription = useMemo(() => {
    if (!transaction) return "この取引を削除しますか？"
    const label = transaction.type === "expense" ? "支出" : "収入"
    return `${transaction.occurred_on} の${label} ¥${transaction.amount.toLocaleString()}を削除します。この操作は取り消せません。`
  }, [transaction])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.occurred_on)) return "日付はYYYY-MM-DD形式で入力してください"
    const amountNumber = Number(draft.amount)
    if (!Number.isInteger(amountNumber) || amountNumber < 0) return "金額は0以上の整数を入力してください"
    if (!draft.category_id) return "カテゴリを選択してください"
    if (!draft.account_id) return "アカウントを選択してください"
    return null
  }

  function extractErrorMessage(payload: unknown, fallback: string) {
    if (payload && typeof payload === "object" && "message" in payload) {
      const maybe = (payload as { message?: unknown }).message
      if (typeof maybe === "string" && maybe.trim()) return maybe
    }
    return fallback
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!transaction) return
    setError(null)
    setStatus(null)
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: draft.kind,
          occurred_on: draft.occurred_on,
          amount: Number(draft.amount),
          category_id: draft.category_id,
          account_id: draft.account_id,
          place: draft.place || undefined,
          memo: draft.memo || undefined,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(extractErrorMessage(payload, "更新に失敗しました"))
      }
      setStatus("取引を更新しました")
      onUpdated()
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新に失敗しました"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!transaction) return
    setError(null)
    setStatus(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) {
        const payload = await res.json().catch(() => null)
        throw new Error(extractErrorMessage(payload, "削除に失敗しました"))
      }
      setShowDeleteConfirm(false)
      onDeleted()
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "削除に失敗しました"
      setError(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-base font-semibold">取引の編集</DialogHeader>
        {!transaction ? (
          <div className="p-4 text-sm text-muted-foreground">取引を読み込んでいます...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {loadingOptions && (
              <div className="text-xs text-muted-foreground">選択肢を読み込み中...</div>
            )}
            {error && (
              <div className="text-sm text-red-600" role="alert">
                {error}
              </div>
            )}
            {status && (
              <div className="text-sm text-green-600" role="status">
                {status}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">種別</label>
                <Select
                  value={draft.kind}
                  onChange={(value) => update("kind", value as Kind)}
                  appearance="inset"
                  variant="neumorphic"
                  className="rounded-2xl bg-transparent"
                  options={[
                    { value: "expense", label: "支出" },
                    { value: "income", label: "収入" },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">日付</label>
                <DatePicker
                  value={draft.occurred_on}
                  onChange={(event) => update("occurred_on", event.target.value)}
                  className="border-0 rounded-2xl px-4 py-3 w-full"
                  style={{
                    background: "#f0f0f0",
                    boxShadow: "inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff",
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">金額</label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draft.amount}
                    onChange={(event) => update("amount", event.target.value)}
                    className="border-0 rounded-2xl px-4 py-3 w-full pr-10"
                    style={{
                      background: "#f0f0f0",
                      boxShadow: "inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff",
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">円</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">カテゴリ</label>
                <Select
                  value={draft.category_id}
                  onChange={(value) => update("category_id", value)}
                  appearance="inset"
                  variant="neumorphic"
                  className="rounded-2xl bg-transparent"
                  options={[
                    { value: "", label: "選択してください" },
                    ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">アカウント</label>
                <Select
                  value={draft.account_id}
                  onChange={(value) => update("account_id", value)}
                  appearance="inset"
                  variant="neumorphic"
                  className="rounded-2xl bg-transparent"
                  options={[
                    { value: "", label: "選択してください" },
                    ...accounts.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">利用場所（任意）</label>
                <Input
                  value={draft.place}
                  onChange={(event) => update("place", event.target.value)}
                  className="border-0 rounded-2xl px-4 py-3"
                  style={{
                    background: "#f0f0f0",
                    boxShadow: "inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff",
                  }}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">メモ（任意）</label>
                <Input
                  value={draft.memo}
                  onChange={(event) => update("memo", event.target.value)}
                  className="border-0 rounded-2xl px-4 py-3"
                  style={{
                    background: "#f0f0f0",
                    boxShadow: "inset 8px 8px 16px #d0d0d0, inset -8px -8px 16px #ffffff",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
              <Button
                type="button"
                variant="destructive"
                className="sm:w-auto"
                disabled={submitting || deleting}
                onClick={() => setShowDeleteConfirm(true)}
              >
                削除する
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end flex-1">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting || deleting}
                  onClick={() => onOpenChange(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={submitting || deleting}>
                  {submitting ? "更新中…" : "更新する"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="取引を削除しますか？"
        description={deleteDescription}
        confirmText={deleting ? "削除中…" : "削除する"}
        cancelText="キャンセル"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (deleting) return
          setShowDeleteConfirm(false)
        }}
      />
    </>
  )
}
