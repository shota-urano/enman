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
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "min-w-60 max-w-96 rounded-md border px-4 py-3 text-sm shadow-md " +
              (t.type === "success"
                ? "bg-secondary text-secondary-foreground border-border"
                : t.type === "error"
                ? "bg-destructive text-white border-destructive/30"
                : "bg-background text-foreground border-border")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

