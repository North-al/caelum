import { useCallback, useEffect, useRef } from "react"

interface ScrollSyncTargets {
  editorScrollEl: HTMLElement | null
  previewScrollEl: HTMLElement | null
  enabled: boolean
}

const syncRaf = (callback: () => void) => {
  return window.requestAnimationFrame(callback)
}

const computeRatio = (el: HTMLElement) => {
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) {
    return 0
  }
  return el.scrollTop / maxScroll
}

const applyRatio = (el: HTMLElement, ratio: number) => {
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll <= 0) {
    return
  }
  el.scrollTop = Math.max(0, Math.min(maxScroll, ratio * maxScroll))
}

export const useScrollSync = ({ editorScrollEl, previewScrollEl, enabled }: ScrollSyncTargets) => {
  const lockSource = useRef<"editor" | "preview" | null>(null)
  const lockTimer = useRef<number | null>(null)

  const requestUnlock = useCallback(() => {
    if (lockTimer.current) {
      window.clearTimeout(lockTimer.current)
    }
    lockTimer.current = window.setTimeout(() => {
      lockSource.current = null
    }, 120)
  }, [])

  useEffect(() => {
    if (!enabled || !editorScrollEl) {
      return
    }

    const handleEditorScroll = () => {
      if (lockSource.current === "preview") {
        return
      }
      lockSource.current = "editor"
      requestUnlock()
      syncRaf(() => {
        if (!previewScrollEl) {
          return
        }
        applyRatio(previewScrollEl, computeRatio(editorScrollEl))
      })
    }

    editorScrollEl.addEventListener("scroll", handleEditorScroll, { passive: true })
    return () => editorScrollEl.removeEventListener("scroll", handleEditorScroll)
  }, [editorScrollEl, previewScrollEl, enabled, requestUnlock])

  useEffect(() => {
    if (!enabled || !previewScrollEl) {
      return
    }

    const handlePreviewScroll = () => {
      if (lockSource.current === "editor") {
        return
      }
      lockSource.current = "preview"
      requestUnlock()
      syncRaf(() => {
        if (!editorScrollEl) {
          return
        }
        applyRatio(editorScrollEl, computeRatio(previewScrollEl))
      })
    }

    previewScrollEl.addEventListener("scroll", handlePreviewScroll, { passive: true })
    return () => previewScrollEl.removeEventListener("scroll", handlePreviewScroll)
  }, [editorScrollEl, previewScrollEl, enabled, requestUnlock])

  useEffect(() => {
    return () => {
      if (lockTimer.current) {
        window.clearTimeout(lockTimer.current)
      }
    }
  }, [])
}
