"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { WALKTHROUGH_VERSION } from "@/lib/walkthrough"
import { useToast } from "@/components/ui/toast"

type Step = {
  title: string
  points: string[]
}

const STEPS: Step[] = [
  {
    title: "バージョンアップのお知らせ",
    points: [
      "Enmann が最新バージョンにアップデートされ、思い出の振り返り体験が大幅に向上しました。",
      "新機能のハイライトと使い方のヒントをご紹介します。",
    ],
  },
  {
    title: "思い出マップで場所を記録",
    points: [
      "取引登録に Google の場所検索を追加。チェックを入れると位置情報付きで登録できます。",
      "保存された思い出は「思い出」タブから地図上で振り返り可能。ズームや期間フィルタも活用できます。",
    ],
  },
  {
    title: "ナビゲーションと通知の改善",
    points: [
      "未読通知は設定メニューで確認でき、トップ右上にも新着トーストが表示されるようになりました。",
    ],
  },
]

export default function FeatureWalkthroughModal() {
  const pathname = usePathname()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const totalSteps = useMemo(() => STEPS.length, [])

  useEffect(() => {
    if (!pathname || pathname.startsWith("/auth")) return
    let active = true

    const load = async () => {
      try {
        const res = await fetch(`/api/walkthrough?version=${encodeURIComponent(WALKTHROUGH_VERSION)}`, { cache: "no-store" })
        if (!res.ok) return
        const json = await res.json().catch(() => null)
        if (!json || typeof json !== "object") return
        if (active && json.show) {
          setOpen(true)
          setStep(0)
        }
      } catch {
        // silent fail
      }
    }
    load()
    return () => {
      active = false
    }
  }, [pathname])

  async function markCompleted(version: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/walkthrough", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error((payload && payload.message) || "ウォークスルーの状態更新に失敗しました")
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        show(err.message, "error")
      } else {
        show("ウォークスルーの状態更新に失敗しました", "error")
      }
    } finally {
      setLoading(false)
      setOpen(false)
      setDismissed(true)
    }
  }

  const handleClose = () => {
    if (!loading && !dismissed) {
      void markCompleted(WALKTHROUGH_VERSION)
    } else {
      setOpen(false)
    }
  }

  const current = STEPS[step]

  if (!open || pathname?.startsWith("/auth")) return null

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) handleClose()
    }}>
      <DialogContent className="mx-4 w-[min(94vw,32rem)] max-w-lg px-8 pb-8 pt-7">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">アップデートのご案内</h3>
            <span className="text-xs text-muted-foreground">
              {step + 1} / {totalSteps}
            </span>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <h4 className="text-base font-semibold text-foreground">{current.title}</h4>
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {current.points.map((point, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/70" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-nowrap items-center justify-end gap-2 overflow-x-auto">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
        disabled={step === 0 || loading}
        style={{ boxShadow: "none" }}
        size="sm"
      >
        戻る
      </Button>
      <Button
            type="button"
            onClick={() => {
              if (step + 1 >= totalSteps) {
                setDismissed(true)
                void markCompleted(WALKTHROUGH_VERSION)
        } else {
          setStep((prev) => Math.min(prev + 1, totalSteps - 1))
        }
        }}
        disabled={loading}
        style={{ boxShadow: "none" }}
        size="sm"
      >
        {step + 1 >= totalSteps ? (loading ? "保存中..." : "はじめる") : "次へ"}
      </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDismissed(true)
              void markCompleted(WALKTHROUGH_VERSION)
            }}
            disabled={loading}
            size="sm"
          >
            スキップ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
