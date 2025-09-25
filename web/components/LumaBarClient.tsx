"use client"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import LumaBar from "@/components/LumaBar"

type NavId = NonNullable<Parameters<typeof LumaBar>[0]["current"]>

function resolveCurrent(pathname: string): NavId {
  if (pathname.startsWith("/transactions/new")) return "new"
  if (pathname.startsWith("/settings")) return "settings"
  if (pathname.startsWith("/notifications") || pathname.startsWith("/alerts")) return "alerts"
  if (pathname.startsWith("/subscriptions")) return "subscriptions"
  if (pathname.startsWith("/reports")) return "reports"
  if (pathname === "/" || pathname.startsWith("/calendar")) return "calendar"
  return "calendar"
}

export default function LumaBarClient() {
  const router = useRouter()
  const pathname = usePathname()
  const current = resolveCurrent(pathname)
  const [unread, setUnread] = useState<number>(0)
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
          setUnread(Array.isArray(list) ? list.length : 0)
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
  }, [hide])

  if (hide) return null

  return (
    <LumaBar
      current={current}
      badges={{ alerts: unread }}
      onNavigate={(to) => {
        switch (to) {
          case "calendar":
            router.push("/calendar")
            break
          case "reports":
            router.push("/reports")
            break
          case "subscriptions":
            router.push("/subscriptions")
            break
          case "new":
            router.push("/transactions/new")
            break
          case "alerts":
            router.push("/notifications")
            break
          case "settings":
            router.push("/settings")
            break
        }
      }}
    />
  )
}
