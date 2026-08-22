import type { CSSProperties, ReactNode } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

const RESIZE_EDGES = [
  { edge: "n", direction: "North" },
  { edge: "s", direction: "South" },
  { edge: "e", direction: "East" },
  { edge: "w", direction: "West" },
  { edge: "ne", direction: "NorthEast" },
  { edge: "nw", direction: "NorthWest" },
  { edge: "se", direction: "SouthEast" },
  { edge: "sw", direction: "SouthWest" },
] as const

interface Props {
  style?: CSSProperties
  children: ReactNode
  sheet?: ReactNode
}

export const GlassStreamShell = ({ style, children, sheet }: Props) => {
  return (
    <div className="glass-stream-root" style={style}>
      {RESIZE_EDGES.map((item) => (
        <div
          key={item.edge}
          data-edge={item.edge}
          className="glass-stream-resize"
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void getCurrentWindow().startResizeDragging(item.direction as never)
          }}
        />
      ))}
      {children}
      {sheet}
    </div>
  )
}
