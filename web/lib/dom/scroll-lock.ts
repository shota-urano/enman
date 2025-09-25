let lockCount = 0
let originalOverflow: string | null = null
let originalPaddingRight: string | null = null

function applyLock() {
  if (typeof document === "undefined") return
  const { body, documentElement } = document
  if (!body || !documentElement) return

  if (lockCount === 0) {
    originalOverflow = body.style.overflow || null
    originalPaddingRight = body.style.paddingRight || null
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`
    }
  }
  lockCount += 1
}

function releaseLock() {
  if (typeof document === "undefined") return
  const { body } = document
  if (!body) return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  if (originalOverflow !== null) {
    body.style.overflow = originalOverflow
  } else {
    body.style.removeProperty("overflow")
  }
  if (originalPaddingRight !== null) {
    body.style.paddingRight = originalPaddingRight
  } else {
    body.style.removeProperty("padding-right")
  }
  originalOverflow = null
  originalPaddingRight = null
}

export function acquireScrollLock(): () => void {
  applyLock()
  return releaseLock
}

export function clearAllScrollLocks() {
  while (lockCount > 0) releaseLock()
}
