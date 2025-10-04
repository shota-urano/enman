"use client"
import * as React from "react"

type Toast = { id: number; message: string; type?: "info" | "success" | "error" }

type ToastContextValue = {
  toasts: Toast[]
  show: (message: string, type?: Toast["type"]) => void
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast は <ToastProvider> 内で使用してください')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = React.useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    // auto dismiss after 3s
    setTimeout(() => dismiss(id), 3000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      {/* Portal-less inline toaster */}
      <div className="fixed top-6 right-6 z-50 space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "min-w-60 max-w-96 rounded-[28px] border px-5 py-3 text-sm shadow-neumorphic-soft backdrop-blur-sm transition-all" +
              (t.type === "success"
                ? " bg-gradient-to-br from-[rgba(219,234,254,1)] via-[rgba(191,219,254,0.92)] to-[rgba(147,197,253,0.88)] text-foreground border-white/60"
                : t.type === "error"
                ? " bg-gradient-to-br from-[rgba(255,228,232,1)] via-[rgba(255,210,217,0.94)] to-[rgba(242,139,148,0.9)] text-foreground border-white/40"
                : " bg-gradient-to-br from-white via-[rgba(255,255,255,0.94)] to-[rgba(226,231,242,0.92)] text-foreground border-white/50")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

