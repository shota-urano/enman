"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"

type Category = { id: string; name: string }
type Account = { id: string; name: string }
type Subscription = {
  id: string
  name: string
  expected_amount: number
  category_id: string
  account_id: string
  billing_day: number
  note: string | null
}

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [list, setList] = useState<Subscription[]>([])
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState("")
  const [expectedAmount, setExpectedAmount] = useState(0)
  const [categoryId, setCategoryId] = useState<string>("")
  const [accountId, setAccountId] = useState<string>("")
  const [billingDay, setBillingDay] = useState<number>(1)
  const [note, setNote] = useState<string>("")

  // Edit modal state
  const [edit, setEdit] = useState<Subscription | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; amount: number } | null>(null)

  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")

  const highlightedSet = useMemo(() => new Set([highlightId ?? ""]), [highlightId])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [catsRes, acctsRes, subsRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/accounts", { cache: "no-store" }),
          fetch("/api/subscriptions", { cache: "no-store" }),
        ])
        if (!catsRes.ok) throw new Error("Failed to load categories")
        if (!acctsRes.ok) throw new Error("Failed to load accounts")
        if (!subsRes.ok) throw new Error("Failed to load subscriptions")
        const cats = (await catsRes.json()) as Category[]
        const accts = (await acctsRes.json()) as Account[]
        const subs = (await subsRes.json()) as Subscription[]
        setCategories(cats)
        setAccounts(accts)
        setList(subs)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const resetCreate = () => {
    setName("")
    setExpectedAmount(0)
    setCategoryId("")
    setAccountId("")
    setBillingDay(1)
    setNote("")
  }

  const reload = async () => {
    const res = await fetch("/api/subscriptions", { cache: "no-store" })
    if (res.ok) {
      const subs = (await res.json()) as Subscription[]
      setList(subs)
    }
  }

  const onCreate = async () => {
    setError(null)
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              expected_amount: Number(expectedAmount),
              category_id: categoryId,
              account_id: accountId,
              billing_day: Number(billingDay),
              note: note || null,
            }),
          })
          if (!res.ok) throw new Error((await res.text()) || "Failed to create")
          resetCreate()
          await reload()
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg || "failed to create")
        }
      })()
    })
  }

  const onDelete = async (id: string) => {
    if (!confirm("Delete this subscription?")) return
    setError(null)
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" })
          if (!res.ok) throw new Error((await res.text()) || "Failed to delete")
          await reload()
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg || "failed to delete")
        }
      })()
    })
  }

  const onUpdate = async (id: string, input: Partial<Subscription>) => {
    setError(null)
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/subscriptions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: input.name,
              expected_amount: input.expected_amount,
              category_id: input.category_id,
              account_id: input.account_id,
              billing_day: input.billing_day,
              note: input.note,
            }),
          })
          if (!res.ok) throw new Error((await res.text()) || "Failed to update")
          setEdit(null)
          await reload()
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg || "failed to update")
        }
      })()
    })
  }

  const onConfirm = async (id: string, amount?: number) => {
    setError(null)
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/subscriptions/${id}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
          })
          if (!res.ok) throw new Error((await res.text()) || "Failed to confirm")
          setConfirmDialog(null)
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg || "failed to confirm")
        }
      })()
    })
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Subscriptions</h1>
      {error && (
        <div className="text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Create Form */}
      <Card className="p-4 space-y-3">
        <div className="font-medium">Create Subscription</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Expected Amount"
            type="number"
            value={expectedAmount}
            onChange={(e) => setExpectedAmount(Number(e.target.value || 0))}
          />
          <Select value={categoryId} onChange={(e) => setCategoryId(e.currentTarget.value)}>
            <option value="" disabled>
              Category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={accountId} onChange={(e) => setAccountId(e.currentTarget.value)}>
            <option value="" disabled>
              Account
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Billing Day (1-31)"
            type="number"
            value={billingDay}
            min={1}
            max={31}
            onChange={(e) => setBillingDay(Number(e.target.value || 1))}
          />
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <Button onClick={onCreate} disabled={pending}>
            Create
          </Button>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {list.length === 0 && <div className="text-sm text-muted-foreground">No subscriptions</div>}
        {list.map((s) => (
          <Card
            key={s.id}
            className={
              "p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border " +
              (highlightedSet.has(s.id) ? "border-amber-500" : "")
            }
          >
            <div className="space-y-1">
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted-foreground">
                ¥{s.expected_amount.toLocaleString()} / day {s.billing_day}
              </div>
              <div className="text-xs text-muted-foreground">note: {s.note ?? "-"}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEdit(s)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => onDelete(s.id)}>
                Delete
              </Button>
              <Button onClick={() => setConfirmDialog({ id: s.id, amount: s.expected_amount })}>Confirm</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>Edit Subscription</DialogHeader>
          {edit && (
            <EditForm
              categories={categories}
              accounts={accounts}
              value={edit}
              onCancel={() => setEdit(null)}
              onSave={(v) => onUpdate(edit.id, v)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>Confirm Subscription</DialogHeader>
          {confirmDialog && (
            <div className="space-y-3">
              <Input
                type="number"
                value={confirmDialog.amount}
                onChange={(e) => setConfirmDialog({ ...confirmDialog, amount: Number(e.target.value || 0) })}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setConfirmDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={() => onConfirm(confirmDialog.id, confirmDialog.amount)}>Confirm</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditForm(props: {
  value: Subscription
  categories: Category[]
  accounts: Account[]
  onSave: (v: Partial<Subscription>) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<Partial<Subscription>>({ ...props.value })
  return (
    <div className="space-y-3">
      <Input placeholder="Name" value={v.name ?? ""} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <Input
        placeholder="Expected Amount"
        type="number"
        value={v.expected_amount ?? 0}
        onChange={(e) => setV({ ...v, expected_amount: Number(e.target.value || 0) })}
      />
      <Select value={v.category_id ?? ""} onChange={(e) => setV({ ...v, category_id: e.currentTarget.value })}>
        <option value="" disabled>
          Category
        </option>
        {props.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select value={v.account_id ?? ""} onChange={(e) => setV({ ...v, account_id: e.currentTarget.value })}>
        <option value="" disabled>
          Account
        </option>
        {props.accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Input
        placeholder="Billing Day (1-31)"
        type="number"
        value={v.billing_day ?? 1}
        min={1}
        max={31}
        onChange={(e) => setV({ ...v, billing_day: Number(e.target.value || 1) })}
      />
      <Input
        placeholder="Note (optional)"
        value={v.note ?? ""}
        onChange={(e) => setV({ ...v, note: e.target.value })}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button onClick={() => props.onSave(v)}>Save</Button>
      </div>
    </div>
  )
}

