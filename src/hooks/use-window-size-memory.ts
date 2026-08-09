import { useEffect, useRef } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { LogicalSize } from "@tauri-apps/api/dpi"

import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

/** Apply remembered size at most once per app session (survives route remounts). */
let sizeAppliedThisSession = false

const clampWindowSize = (width: number, height: number) => {
  const safeWidth = Number.isFinite(width) ? Math.round(width) : DEFAULT_WINDOW_WIDTH
  const safeHeight = Number.isFinite(height) ? Math.round(height) : DEFAULT_WINDOW_HEIGHT

  // Reject corrupt / transient tiny sizes (common race before the window is ready).
  if (safeWidth < MIN_WINDOW_WIDTH || safeHeight < MIN_WINDOW_HEIGHT) {
    return { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT }
  }

  // Guard against absurdly large values (e.g. maximized physical pixels saved by mistake).
  const maxWidth = 6000
  const maxHeight = 4000
  return {
    width: Math.min(safeWidth, maxWidth),
    height: Math.min(safeHeight, maxHeight),
  }
}

/** Restore remembered window size once and persist user resizes across all pages. */
export const useWindowSizeMemory = () => {
  const updateUiState = useWorkspaceStore((state) => state.updateUiState)
  const config = useWorkspaceStore((state) => state.config)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!config || sizeAppliedThisSession) {
      return
    }

    const { width, height } = clampWindowSize(
      config.uiState.windowWidth || DEFAULT_WINDOW_WIDTH,
      config.uiState.windowHeight || DEFAULT_WINDOW_HEIGHT
    )
    sizeAppliedThisSession = true

    void (async () => {
      try {
        const appWindow = getCurrentWindow()
        if (await appWindow.isMaximized()) {
          return
        }
        await appWindow.setSize(new LogicalSize(width, height))
      } catch {
        // Ignore when not running inside Tauri.
      }
    })()
  }, [config])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let cancelled = false

    void getCurrentWindow()
      .onResized(async () => {
        try {
          const appWindow = getCurrentWindow()
          // Maximized / fullscreen should not overwrite the restored normal size.
          if (await appWindow.isMaximized()) {
            return
          }

          const size = await appWindow.innerSize()
          const factor = await appWindow.scaleFactor()
          const logicalWidth = Math.round(size.width / factor)
          const logicalHeight = Math.round(size.height / factor)

          // Ignore transient invalid sizes during DPI / monitor changes.
          if (logicalWidth < MIN_WINDOW_WIDTH || logicalHeight < MIN_WINDOW_HEIGHT) {
            return
          }

          const { width, height } = clampWindowSize(logicalWidth, logicalHeight)

          if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current)
          }

          saveTimerRef.current = window.setTimeout(() => {
            void updateUiState({ windowWidth: width, windowHeight: height })
          }, 400)
        } catch {
          // ignore
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn()
          return
        }
        unlisten = fn
      })
      .catch(() => {
        // Non-Tauri environments.
      })

    return () => {
      cancelled = true
      unlisten?.()
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [updateUiState])
}
