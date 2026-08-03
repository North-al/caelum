import { useEffect, useRef } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { LogicalSize } from "@tauri-apps/api/dpi"

import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
} from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

/** Restore remembered window size and persist user resizes. */
export const useWindowSizeMemory = () => {
  const updateUiState = useWorkspaceStore((state) => state.updateUiState)
  const config = useWorkspaceStore((state) => state.config)
  const appliedRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!config || appliedRef.current) {
      return
    }

    const width = Math.round(config.uiState.windowWidth || DEFAULT_WINDOW_WIDTH)
    const height = Math.round(config.uiState.windowHeight || DEFAULT_WINDOW_HEIGHT)
    appliedRef.current = true

    void getCurrentWindow()
      .setSize(new LogicalSize(width, height))
      .catch(() => {
        // Ignore when not running inside Tauri.
      })
  }, [config])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let cancelled = false

    void getCurrentWindow()
      .onResized(async () => {
        try {
          const size = await getCurrentWindow().innerSize()
          const factor = await getCurrentWindow().scaleFactor()
          const width = Math.round(size.width / factor)
          const height = Math.round(size.height / factor)

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
