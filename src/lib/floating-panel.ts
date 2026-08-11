/** Shared helpers for draggable floating panels (goto line, quick open). */

export interface PanelPosition {
  left: number
  top: number
}

const EDGE = 12

export const clampPanelPosition = (
  left: number,
  top: number,
  width: number,
  height: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800
): PanelPosition => {
  const maxLeft = Math.max(EDGE, viewportWidth - Math.max(width, 40) - EDGE)
  const maxTop = Math.max(EDGE, viewportHeight - Math.max(height, 40) - EDGE)
  return {
    left: Math.min(maxLeft, Math.max(EDGE, left)),
    top: Math.min(maxTop, Math.max(EDGE, top)),
  }
}

/**
 * Restore a saved panel position, or fall back to default when missing / off-screen.
 */
export const resolvePanelPosition = (
  stored: PanelPosition | null | undefined,
  size: { width: number; height: number },
  fallback: () => PanelPosition
): PanelPosition => {
  const fb = () => {
    const raw = fallback()
    return clampPanelPosition(raw.left, raw.top, size.width, size.height)
  }

  if (
    !stored ||
    typeof stored.left !== "number" ||
    typeof stored.top !== "number" ||
    !Number.isFinite(stored.left) ||
    !Number.isFinite(stored.top)
  ) {
    return fb()
  }

  const clamped = clampPanelPosition(stored.left, stored.top, size.width, size.height)
  // Saved coords were far outside the viewport → treat as corrupt and reset.
  if (Math.abs(clamped.left - stored.left) > 96 || Math.abs(clamped.top - stored.top) > 96) {
    return fb()
  }
  return clamped
}

export const defaultCenteredPosition = (
  width: number,
  height: number,
  yRatio = 0.38
): PanelPosition => {
  const left = Math.round((window.innerWidth - width) / 2)
  const top = Math.round(window.innerHeight * yRatio - height / 2)
  return clampPanelPosition(left, top, width, height)
}

/** Attach pointer-drag to a handle; returns cleanup. */
export const attachPanelDrag = (
  panel: HTMLElement,
  handle: HTMLElement,
  onMove: (pos: PanelPosition) => void,
  onEnd?: (pos: PanelPosition) => void
) => {
  let dragging = false
  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest("input, textarea, button, a, [data-no-drag]")) {
      return
    }
    dragging = true
    startX = event.clientX
    startY = event.clientY
    const rect = panel.getBoundingClientRect()
    originLeft = rect.left
    originTop = rect.top
    handle.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    const next = clampPanelPosition(
      originLeft + (event.clientX - startX),
      originTop + (event.clientY - startY),
      panel.offsetWidth || panel.getBoundingClientRect().width,
      panel.offsetHeight || panel.getBoundingClientRect().height
    )
    panel.style.left = `${next.left}px`
    panel.style.top = `${next.top}px`
    panel.style.transform = "none"
    onMove(next)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return
    dragging = false
    try {
      handle.releasePointerCapture?.(event.pointerId)
    } catch {
      // ignore
    }
    const rect = panel.getBoundingClientRect()
    const next = clampPanelPosition(rect.left, rect.top, rect.width, rect.height)
    panel.style.left = `${next.left}px`
    panel.style.top = `${next.top}px`
    onEnd?.(next)
  }

  handle.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  return () => {
    handle.removeEventListener("pointerdown", onPointerDown)
    window.removeEventListener("pointermove", onPointerMove)
    window.removeEventListener("pointerup", onPointerUp)
    window.removeEventListener("pointercancel", onPointerUp)
  }
}
