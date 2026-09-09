import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

import { defaultSettings } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

export const MIN_CONTENT_FONT_SIZE = 10
export const MAX_CONTENT_FONT_SIZE = 48
export const DEFAULT_CONTENT_FONT_SIZE = defaultSettings.editorFontSize || 14

type Options = {
  /** Resolve the real overflow scroller (e.g. CodeMirror `.cm-scroller`). Default: container itself. */
  getScroller?: (root: HTMLElement) => HTMLElement
}

/**
 * Ctrl/Cmd + wheel font zoom — same pattern as MarkdownEditor:
 * stable ref, window capture listener, lock scroller scrollTop while size changes.
 */
export const useContentFontZoom = (
  containerRef: RefObject<HTMLElement | null>,
  options?: Options
) => {
  const updateSettings = useWorkspaceStore((state) => state.updateSettings)
  const settingsFontSize =
    useWorkspaceStore((state) => state.config?.settings.editorFontSize) || DEFAULT_CONTENT_FONT_SIZE

  const getScrollerRef = useRef(options?.getScroller)
  getScrollerRef.current = options?.getScroller

  const fontSizeRef = useRef(settingsFontSize)
  const persistTimerRef = useRef<number | null>(null)
  const hideHudTimerRef = useRef<number | null>(null)
  const [fontSize, setFontSize] = useState(settingsFontSize)
  const [zoomHudVisible, setZoomHudVisible] = useState(false)

  fontSizeRef.current = fontSize

  useEffect(() => {
    setFontSize(settingsFontSize)
    fontSizeRef.current = settingsFontSize
  }, [settingsFontSize])

  const showZoomHud = useCallback(() => {
    setZoomHudVisible(true)
    if (hideHudTimerRef.current) {
      window.clearTimeout(hideHudTimerRef.current)
    }
    hideHudTimerRef.current = window.setTimeout(() => {
      setZoomHudVisible(false)
    }, 1600)
  }, [])

  const applyFontSize = useCallback(
    (next: number) => {
      const clamped = Math.min(
        MAX_CONTENT_FONT_SIZE,
        Math.max(MIN_CONTENT_FONT_SIZE, Math.round(next))
      )
      fontSizeRef.current = clamped
      setFontSize(clamped)
      showZoomHud()
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current)
      }
      persistTimerRef.current = window.setTimeout(() => {
        void updateSettings({ editorFontSize: clamped })
      }, 280)
    },
    [showZoomHud, updateSettings]
  )

  useEffect(() => {
    const resolveScroller = (root: HTMLElement) => getScrollerRef.current?.(root) ?? root

    const commitSize = (root: HTMLElement, next: number) => {
      const scroller = resolveScroller(root)
      const lockedTop = scroller.scrollTop
      const clamped = Math.min(
        MAX_CONTENT_FONT_SIZE,
        Math.max(MIN_CONTENT_FONT_SIZE, Math.round(next))
      )
      fontSizeRef.current = clamped
      setFontSize(clamped)
      setZoomHudVisible(true)
      if (hideHudTimerRef.current) {
        window.clearTimeout(hideHudTimerRef.current)
      }
      hideHudTimerRef.current = window.setTimeout(() => {
        setZoomHudVisible(false)
      }, 1600)
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current)
      }
      persistTimerRef.current = window.setTimeout(() => {
        void updateSettings({ editorFontSize: clamped })
      }, 280)
      scroller.scrollTop = lockedTop
      requestAnimationFrame(() => {
        scroller.scrollTop = lockedTop
      })
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }

      const root = containerRef.current
      if (!root) {
        return
      }
      const target = event.target
      if (!(target instanceof Node) || !root.contains(target)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation()
      }

      const delta = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0
      if (delta === 0) {
        return
      }
      commitSize(root, fontSizeRef.current + delta)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      if (event.altKey || event.shiftKey) {
        return
      }
      const isZero = event.key === "0" || event.code === "Digit0" || event.code === "Numpad0"
      if (!isZero) {
        return
      }

      const root = containerRef.current
      if (!root) {
        return
      }
      const active = document.activeElement
      const target = event.target
      const inside =
        (active instanceof Node && root.contains(active)) ||
        (target instanceof Node && root.contains(target))
      if (!inside) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      commitSize(root, DEFAULT_CONTENT_FONT_SIZE)
    }

    window.addEventListener("wheel", onWheel, { passive: false, capture: true })
    window.addEventListener("keydown", onKeyDown, true)
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true })
      window.removeEventListener("keydown", onKeyDown, true)
    }
  }, [containerRef, updateSettings])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current)
      }
      if (hideHudTimerRef.current) {
        window.clearTimeout(hideHudTimerRef.current)
      }
    }
  }, [])

  return {
    fontSize,
    zoomHudVisible,
    applyFontSize,
    resetFontSize: () => applyFontSize(DEFAULT_CONTENT_FONT_SIZE),
  }
}
