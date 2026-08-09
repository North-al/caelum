import { useEffect, useRef, type RefObject } from "react"

interface ScrollSyncOptions {
  editorRef: RefObject<HTMLElement | null>
  previewRef: RefObject<HTMLElement | null>
  enabled: boolean
  /** Bump when layout / file / content changes so listeners rebind. */
  revision: string | number
}

const computeRatio = (el: HTMLElement) => {
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 1) {
    return 0
  }
  return el.scrollTop / maxScroll
}

const applyRatio = (el: HTMLElement, ratio: number) => {
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 1) {
    return
  }
  const next = Math.max(0, Math.min(maxScroll, ratio * maxScroll))
  if (Math.abs(el.scrollTop - next) < 1) {
    return
  }
  el.scrollTop = next
}

/**
 * Ratio-based dual-pane scroll sync.
 * Reads live refs (not render-time `.current`) and rebinds when elements appear.
 */
export const useScrollSync = ({ editorRef, previewRef, enabled, revision }: ScrollSyncOptions) => {
  const lockSource = useRef<"editor" | "preview" | null>(null)
  const lockTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    let editorEl: HTMLElement | null = null
    let previewEl: HTMLElement | null = null
    let rafPoll = 0

    const clearLockTimer = () => {
      if (lockTimer.current) {
        window.clearTimeout(lockTimer.current)
        lockTimer.current = null
      }
    }

    const requestUnlock = () => {
      clearLockTimer()
      lockTimer.current = window.setTimeout(() => {
        lockSource.current = null
      }, 150)
    }

    const onEditorScroll = () => {
      if (!editorEl || !previewEl || lockSource.current === "preview") {
        return
      }
      lockSource.current = "editor"
      requestUnlock()
      const ratio = computeRatio(editorEl)
      window.requestAnimationFrame(() => {
        if (!previewEl || cancelled) {
          return
        }
        applyRatio(previewEl, ratio)
      })
    }

    const onPreviewScroll = () => {
      if (!editorEl || !previewEl || lockSource.current === "editor") {
        return
      }
      lockSource.current = "preview"
      requestUnlock()
      const ratio = computeRatio(previewEl)
      window.requestAnimationFrame(() => {
        if (!editorEl || cancelled) {
          return
        }
        applyRatio(editorEl, ratio)
      })
    }

    const unbind = () => {
      editorEl?.removeEventListener("scroll", onEditorScroll)
      previewEl?.removeEventListener("scroll", onPreviewScroll)
      editorEl = null
      previewEl = null
    }

    const bind = () => {
      const nextEditor = editorRef.current
      const nextPreview = previewRef.current
      if (!nextEditor || !nextPreview) {
        return false
      }
      if (nextEditor === editorEl && nextPreview === previewEl) {
        return true
      }
      unbind()
      editorEl = nextEditor
      previewEl = nextPreview
      editorEl.addEventListener("scroll", onEditorScroll, { passive: true })
      previewEl.addEventListener("scroll", onPreviewScroll, { passive: true })
      return true
    }

    const poll = () => {
      if (cancelled) {
        return
      }
      if (bind()) {
        return
      }
      rafPoll = window.requestAnimationFrame(poll)
    }

    poll()

    // Re-check after layout settles (panel resize / content paint).
    const retryTimers = [80, 200, 400].map((ms) =>
      window.setTimeout(() => {
        if (!cancelled) {
          bind()
        }
      }, ms)
    )

    return () => {
      cancelled = true
      window.cancelAnimationFrame(rafPoll)
      retryTimers.forEach((id) => window.clearTimeout(id))
      clearLockTimer()
      unbind()
    }
  }, [editorRef, previewRef, enabled, revision])
}
