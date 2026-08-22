import { getCurrentWindow } from "@tauri-apps/api/window"
import type { PointerEvent, ReactNode } from "react"

interface Props {
  title: string
  subline?: ReactNode
  windowActions?: ReactNode
  toolbar?: ReactNode
}

export const GlassStreamChrome = ({ title, subline, windowActions, toolbar }: Props) => {
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    void getCurrentWindow().startDragging()
  }

  return (
    <header className="glass-stream-chrome">
      <div
        className="glass-stream-drag-bar"
        data-tauri-drag-region
        onPointerDown={startDrag}
        aria-hidden
      />
      <div className="glass-stream-chrome-grid">
        <div
          className="glass-stream-drag"
          data-tauri-drag-region
          onPointerDown={startDrag}
        >
          <h1 className="glass-stream-title truncate">{title}</h1>
          {subline ? <div className="glass-stream-subline">{subline}</div> : null}
        </div>

        <div className="glass-stream-chrome-side">
          {windowActions ? <div className="glass-stream-window-actions">{windowActions}</div> : null}
          {toolbar ? <div className="glass-stream-toolbar">{toolbar}</div> : null}
        </div>
      </div>
    </header>
  )
}
