"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

export function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("useDialog must be used within <Dialog>")
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
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    else setUncontrolledOpen(v)
  }
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])
  return (
    <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
  )
}

export function DialogTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const { setOpen } = useDialog()
  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e)
        setOpen(true)
      },
    })
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
      className="fixed inset-0 z-50"
    >
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div
        className={cn(
          "relative mx-auto mt-24 w-[min(92vw,420px)] rounded-xl bg-background text-foreground shadow-xl border",
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
    <div className={cn("p-4 border-b text-sm font-medium", className)}>{children}</div>
  )
}

