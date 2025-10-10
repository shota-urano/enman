"use client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import LumaBar from "@/components/LumaBar"
import { useToast } from "@/components/ui/toast"

type NavId = NonNullable<Parameters<typeof LumaBar>[0]["current"]>

function resolveCurrent(pathname: string): NavId {
  if (pathname.startsWith("/transactions/new")) return "new"
  if (pathname.startsWith("/notifications")) return "settings"
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname.startsWith("/subscriptions")) return "settings"
  if (pathname.startsWith("/reports")) return "reports"
  if (pathname.startsWith("/memories")) return "memories"
  if (pathname === "/" || pathname.startsWith("/calendar")) return "calendar"
  return "calendar"
}

export default function LumaBarClient() {
  const router = useRouter()
  const pathname = usePathname()
  const current = resolveCurrent(pathname)
  const [unread, setUnread] = useState<number>(0)
  const [notified, setNotified] = useState(false)
  const { show } = useToast()
  const hide = pathname.startsWith("/auth")

  // fetch unread notifications count (poll lightweight)
  useEffect(() => {
    if (hide) return
    let timer: number | undefined
    const load = async () => {
      try {
        const res = await fetch("/api/notifications?read=false", { cache: "no-store" })
        if (res.ok) {
          const list = await res.json()
          const count = Array.isArray(list) ? list.length : 0
          setUnread(count)
          if (count > 0 && !notified) {
            show(`新着通知が ${count} 件あります`, "info")
            setNotified(true)
          }
          if (count === 0 && notified) {
            setNotified(false)
          }
        }
      } catch {
        // ignore
      } finally {
        timer = window.setTimeout(load, 30_000)
      }
    }
    load()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [hide, notified, show])

  if (hide) return null

  return (
    <LumaBar
      current={current}
      badges={{ settings: unread }}
      onNavigate={(to) => {
        switch (to) {
          case "calendar":
            router.push("/calendar")
            break
          case "reports":
            router.push("/reports")
            break
          case "memories":
            router.push("/memories")
            break
          case "new":
            router.push("/transactions/new")
            break
          case "settings":
            router.push("/settings")
            break
        }
      }}
    />
  )
}
