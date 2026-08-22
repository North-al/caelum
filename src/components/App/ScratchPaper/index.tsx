import { forwardRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"

import { paperTilt, type ScratchNote } from "~/lib/scratch"
import { appearanceStyle, resolveAppearance } from "~/lib/scratch-appearance"
import { cn } from "~/lib/utils"

interface Props {
  note: ScratchNote
  children?: ReactNode
  className?: string
  dragging?: boolean
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onClick?: () => void
}

export const ScratchPaper = forwardRef<HTMLDivElement, Props>(function ScratchPaper(
  {
    note,
    children,
    className,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
  },
  ref
) {
  const tilt = paperTilt(note.id)
  const appearance = resolveAppearance(note)
  const look = appearanceStyle(appearance)

  return (
    <div
      ref={ref}
      data-color={note.color}
      data-scratch-id={note.id}
      className={cn(
        "scratch-paper absolute flex cursor-grab flex-col overflow-hidden active:cursor-grabbing",
        note.status === "archived" && "is-archived",
        note.status === "pinned" && "is-pinned",
        dragging && "z-[80] cursor-grabbing",
        className
      )}
      style={
        {
          ...look,
          left: note.x,
          top: note.y,
          width: note.width,
          height: note.height,
          zIndex: dragging ? 80 : note.zIndex + 1,
          transform: `rotate(${tilt}deg)${dragging ? " scale(1.02)" : ""}`,
          transition: dragging ? "none" : "transform 160ms ease, box-shadow 160ms ease",
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
    >
      <span className="scratch-pin-shade pointer-events-none absolute left-1/2 top-2 -translate-x-1/2" aria-hidden />
      <span className="scratch-pin pointer-events-none absolute left-1/2 top-1.5 z-[2] -translate-x-1/2" aria-hidden />
      {children}
    </div>
  )
})
