"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

type SheetContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

export function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("useSheet must be used within <Sheet>")
  return ctx
}

export type SheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open: openProp, onOpenChange, children }: SheetProps) {
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
  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const { setOpen } = useSheet()
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

export function SheetContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useSheet()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 w-full rounded-t-2xl border bg-background text-foreground shadow-xl",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-1.5 w-12 mx-auto my-2 rounded-full bg-muted" aria-hidden />
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("px-4 pb-3 text-sm font-medium", className)}>{children}</div>
}

