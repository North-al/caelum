import { getCurrentWindow } from "@tauri-apps/api/window"
import type { CSSProperties, ReactNode } from "react"

import { ScratchSurfaceBg } from "~/components/App/ScratchSurfaceArt"
import type { ScratchAppearance } from "~/lib/scratch-appearance"
import { appearanceTone } from "~/lib/scratch-appearance"
import { resolveSurface } from "~/lib/scratch-surfaces"
import { cn } from "~/lib/utils"

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
  appearance: ScratchAppearance
  style?: CSSProperties
  windowDragging?: boolean
  children: ReactNode
  sheet?: ReactNode
}

export const ScratchNoteShell = ({
  appearance,
  style,
  windowDragging = false,
  children,
  sheet,
}: Props) => {
  const surface = resolveSurface(appearance.surfaceId)
  const hasSurfaceArt = appearance.surfaceId !== "none" && Boolean(surface.backgroundImage)
  const tone = appearanceTone(appearance)

  return (
    <div
      className={cn("scratch-note-root", windowDragging && "is-window-dragging")}
      data-surface={appearance.surfaceId}
      data-tone={tone}
      data-has-surface={hasSurfaceArt ? "true" : "false"}
      style={style}
    >
      {RESIZE_EDGES.map((item) => (
        <div
          key={item.edge}
          data-edge={item.edge}
          className="scratch-note-resize"
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void getCurrentWindow().startResizeDragging(item.direction as never)
          }}
        />
      ))}
      <div className="scratch-note-face">
        <ScratchSurfaceBg surfaceId={appearance.surfaceId} />
        <div className="scratch-note-content">
          <div className="scratch-note-content-inner">{children}</div>
        </div>
      </div>
      {sheet}
    </div>
  )
}
