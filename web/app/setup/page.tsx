"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

type Json = Record<string, unknown>

async function postJson<T = unknown>(path: string, body: Json): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as unknown
  if (!res.ok) {
    const msg = (json as { message?: string })?.message || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return json as T
}

export default function SetupPage() {
  const [name, setName] = useState("")
  const [token, setToken] = useState("")
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [loadingJoin, setLoadingJoin] = useState(false)
  const router = useRouter()
  const { show } = useToast()

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault()
    setLoadingCreate(true)
    try {
      await postJson("/api/households", { name })
      show("世帯を作成しました", "success")
      router.replace("/")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "世帯作成に失敗しました"
      show(message, "error")
    } finally {
      setLoadingCreate(false)
    }
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault()
    setLoadingJoin(true)
    try {
      await postJson("/api/households/join", { token })
      show("世帯に参加しました", "success")
      router.replace("/")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "参加に失敗しました"
      show(message, "error")
    } finally {
      setLoadingJoin(false)
    }
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-10 px-6 py-10 md:grid-cols-2">
      <section>
        <h2 className="mb-4 text-xl font-semibold">世帯を作成</h2>
        <form onSubmit={createHousehold} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">世帯名</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loadingCreate}>
            {loadingCreate ? "作成中..." : "作成"}
          </Button>
        </form>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">招待コードで参加</h2>
        <form onSubmit={joinHousehold} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">招待コード</label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loadingJoin}>
            {loadingJoin ? "参加中..." : "参加"}
          </Button>
        </form>
      </section>
    </main>
  )
}

