"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { acquireScrollLock } from "@/lib/dom/scroll-lock"

type SheetContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

type SheetDragContextValue = {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}

const SheetDragContext = React.createContext<SheetDragContextValue | null>(null)
const interactiveTags = new Set(["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT", "LABEL"])

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
  React.useEffect(() => {
    if (!open) return
    const release = acquireScrollLock()
    return release
  }, [open])
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
  const [isAnimating, setIsAnimating] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragState = React.useRef<{ pointerId: number; startY: number } | null>(null)
  const listenersRef = React.useRef<{
    move: (event: PointerEvent) => void
    up: (event: PointerEvent) => void
    cancel: (event: PointerEvent) => void
  } | null>(null)

  const removePointerListeners = React.useCallback(() => {
    if (!listenersRef.current) return
    const { move, up, cancel } = listenersRef.current
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
    window.removeEventListener("pointercancel", cancel)
    listenersRef.current = null
  }, [])

  React.useEffect(() => {
    if (open) {
      setIsVisible(true)
      // 開く際は少し遅延を入れてアニメーションを確実に見せる
      setTimeout(() => setIsAnimating(true), 10)
      setDragOffset(0)
      setIsDragging(false)
    } else {
      setIsAnimating(false)
      // 閉じるアニメーション後に非表示
      const timeout = setTimeout(() => setIsVisible(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [open])

  React.useEffect(() => {
    return () => {
      removePointerListeners()
    }
  }, [removePointerListeners])

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null
      if (target && (interactiveTags.has(target.tagName) || target.closest('[data-sheet-drag-cancel="true"]'))) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      const startY = event.clientY
      dragState.current = { pointerId: event.pointerId, startY }
      setIsDragging(true)
      setDragOffset(0)

      const handleMove = (e: PointerEvent) => {
        if (!dragState.current || e.pointerId !== dragState.current.pointerId) return
        const delta = Math.max(0, e.clientY - dragState.current.startY)
        setDragOffset(delta)
      }

      const finishDrag = (e: PointerEvent, cancelled = false) => {
        if (!dragState.current || e.pointerId !== dragState.current.pointerId) return
        const delta = Math.max(0, e.clientY - dragState.current.startY)
        dragState.current = null
        removePointerListeners()
        if (!cancelled && delta > 120) {
          setIsDragging(false)
          setOpen(false)
          return
        }
        setIsDragging(false)
        setDragOffset(0)
      }

      const handleUp = (e: PointerEvent) => finishDrag(e)
      const handleCancel = (e: PointerEvent) => finishDrag(e, true)

      listenersRef.current = { move: handleMove, up: handleUp, cancel: handleCancel }
      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
      window.addEventListener("pointercancel", handleCancel)
    },
    [removePointerListeners, setOpen],
  )

  if (!isVisible) return null

  const translateBase = isAnimating ? "0%" : "100%"
  const transformValue = `translateY(calc(${translateBase} + ${dragOffset}px))`
  const transitionValue = isDragging ? "none" : "transform 500ms ease-out"

  return (
    <SheetDragContext.Provider value={{ onPointerDown }}>
      <div className="fixed inset-0 z-[60]">
        <div
          className={cn(
            "absolute inset-0 bg-[#eef1f6]/70 backdrop-blur-sm transition-opacity duration-500",
            isAnimating ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 w-full rounded-t-[40px] border border-white/40 bg-white/85 text-foreground shadow-neumorphic bg-surface-neumorphic backdrop-blur-xl",
            className,
          )}
          role="dialog"
          aria-modal="true"
          style={{ transform: transformValue, transition: transitionValue }}
        >
          <div
            className="mx-auto my-3 h-1.5 w-14 cursor-grab rounded-full bg-gradient-to-r from-muted/60 via-white/90 to-muted/60"
            aria-hidden
            // On iOS/Safari, vertical panning consumes the gesture for page scroll and
            // pointermove won't fire unless we opt out. touch-action: none ensures the
            // drag-to-close gesture reliably works when starting from the handle.
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
          />
          {children}
        </div>
      </div>
    </SheetDragContext.Provider>
  )
}

export function SheetHeader({ className, children }: { className?: string; children?: React.ReactNode }) {
  const dragCtx = React.useContext(SheetDragContext)
  return (
    <div
      className={cn(
        "px-6 pb-5 text-sm font-medium text-muted-foreground",
        className,
      )}
      style={dragCtx ? { touchAction: "none" } : undefined}
      // Allow the header region to act as an extended drag handle so the sheet can
      // be closed even when the user starts dragging from the date label area.
      onPointerDown={dragCtx?.onPointerDown}
    >
      {children}
    </div>
  )
}

