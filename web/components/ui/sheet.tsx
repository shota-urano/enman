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
  if (!ctx) throw new Error('useSheet は <Sheet> の内部で使用してください')
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

type ClickableChild = { onClick?: (e: React.MouseEvent) => void }
export function SheetTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement<ClickableChild> }) {
  const { setOpen } = useSheet()
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

export function SheetContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useSheet()
  const [isVisible, setIsVisible] = React.useState(false)
  
  React.useEffect(() => {
    if (open) {
      setIsVisible(true)
      // 開く際は少し遅延を入れてアニメーションを確実に見せる
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      // 閉じるアニメーション後に非表示
      const timeout = setTimeout(() => setIsVisible(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [open])
  
  const [isAnimating, setIsAnimating] = React.useState(false)
  
  if (!isVisible) return null
  
  return (
    <div className="fixed inset-0 z-50">
      <div 
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-500",
          isAnimating ? "opacity-100" : "opacity-0"
        )} 
        onClick={() => setOpen(false)} 
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 w-full rounded-t-2xl border bg-background text-foreground shadow-xl",
          "transform transition-transform duration-500 ease-out",
          isAnimating ? "translate-y-0" : "translate-y-full",
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

