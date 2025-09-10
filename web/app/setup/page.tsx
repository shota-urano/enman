"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

async function postJson(path: string, body: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json?.message || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return json
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
    } catch (err: any) {
      show(err?.message ?? "世帯作成に失敗しました", "error")
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
    } catch (err: any) {
      show(err?.message ?? "参加に失敗しました", "error")
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
        <h2 className="mb-4 text-xl font-semibold">招待トークンで参加</h2>
        <form onSubmit={joinHousehold} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">招待トークン</label>
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

