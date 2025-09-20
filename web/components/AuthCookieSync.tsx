"use client"
import { useEffect } from "react"
import { createSupabaseBrowser } from "@/lib/supabaseBrowser"

function setAccessTokenCookie(token?: string, expiresAt?: number | null) {
  if (!token) {
    // Clear cookie
    document.cookie = `sb-access-token=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  let attrs = `Path=/; SameSite=Lax`;
  if (expiresAt && Number.isFinite(expiresAt)) {
    const maxAge = Math.max(0, Math.floor(expiresAt - Date.now() / 1000));
    attrs = `Max-Age=${maxAge}; ` + attrs;
  }
  document.cookie = `sb-access-token=${encodeURIComponent(token)}; ${attrs}`;
}

export default function AuthCookieSync() {
  useEffect(() => {
    let unsub: (() => void) | undefined
    try {
      const supabase = createSupabaseBrowser()

      // Initial sync
      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token
        const expiresAt = data.session?.expires_at ?? null
        setAccessTokenCookie(token, expiresAt)
      })

      // Keep cookie in sync with auth state
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const token = session?.access_token
        const expiresAt = session?.expires_at ?? null
        setAccessTokenCookie(token, expiresAt)
      })
      unsub = () => sub.subscription.unsubscribe()
    } catch (e) {
      // In production, avoid crashing the entire app if env is missing/invalid
      console.warn('AuthCookieSync disabled:', e)
    }

    return () => {
      if (unsub) unsub()
    }
  }, [])

  return null
}

