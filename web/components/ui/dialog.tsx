"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { acquireScrollLock } from "@/lib/dom/scroll-lock"

type DialogContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

export function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('useDialog は <Dialog> 内で使用してください')
  return ctx
}

export type DialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open: openProp, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback((v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    else setUncontrolledOpen(v)
  }, [onOpenChange])
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, setOpen])
  React.useEffect(() => {
    if (!open) return
    const release = acquireScrollLock()
    return release
  }, [open])
  return (
    <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
  )
}

type ClickableChild = { onClick?: (e: React.MouseEvent) => void }
export function DialogTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement<ClickableChild> }) {
  const { setOpen } = useDialog()
  if (asChild) {
    const handleClick: React.MouseEventHandler = (e) => {
      children.props?.onClick?.(e)
      setOpen(true)
    }
    return React.cloneElement(children, { onClick: handleClick })
  }
  return (
    <button className="btn btn-outline" onClick={() => setOpen(true)}>
      {children}
    </button>
  )
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useDialog()
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60]"
    >
      <div className="absolute inset-0 bg-[#eef1f6]/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className={cn(
          "relative mx-auto mt-24 w-[min(92vw,440px)] max-h-[calc(100dvh-140px)] overflow-y-auto rounded-[32px] border border-white/50 bg-white/80 text-foreground shadow-neumorphic bg-surface-neumorphic",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-t-[32px] border-b border-white/40 bg-white/50 px-6 py-5 text-sm font-medium",
        className,
      )}
    >
      {children}
    </div>
  )
}

