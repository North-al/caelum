import { forwardRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { Archive, GripHorizontal, Inbox, Pin, Trash2 } from "lucide-react"

import { paperTilt, type ScratchNote } from "~/lib/scratch"
import { appearanceStyle, resolveAppearance } from "~/lib/scratch-appearance"
import { cn } from "~/lib/utils"

interface Props {
  note: ScratchNote
  children?: ReactNode
  className?: string
  variant?: "board" | "default"
  dragging?: boolean
  onDelete?: () => void
  onDragStripPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onDragStripPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onDragStripPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onDragStripPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onClick?: () => void
}

const STATUS_META = {
  inbox: { label: "待整理", icon: Inbox },
  pinned: { label: "常驻", icon: Pin },
  archived: { label: "归档", icon: Archive },
} as const

export const ScratchPaper = forwardRef<HTMLDivElement, Props>(function ScratchPaper(
  {
    note,
    children,
    className,
    variant = "default",
    dragging,
    onDelete,
    onDragStripPointerDown,
    onDragStripPointerMove,
    onDragStripPointerUp,
    onDragStripPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
  },
  ref
) {
  const isBoard = variant === "board"
  const tilt = isBoard ? 0 : paperTilt(note.id)
  const appearance = resolveAppearance(note)
  const look = appearanceStyle(appearance)
  const status = STATUS_META[note.status]
  const StatusIcon = status.icon

  const paperStyle: CSSProperties = isBoard
    ? {
        ...look,
        position: "relative",
        width: "100%",
        height: "100%",
        transform: dragging ? "scale(1.02)" : undefined,
        transition: dragging ? "none" : "transform 160ms ease, box-shadow 160ms ease",
      }
    : {
        ...look,
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        zIndex: dragging ? 80 : note.zIndex + 1,
        transform: `rotate(${tilt}deg)${dragging ? " scale(1.02)" : ""}`,
        transition: dragging ? "none" : "transform 160ms ease, box-shadow 160ms ease",
      }

  return (
    <div
      ref={ref}
      data-color={note.color}
      data-scratch-id={note.id}
      data-status={note.status}
      className={cn(
        isBoard ? "scratch-paper scratch-paper-board relative" : "scratch-paper absolute",
        "flex flex-col overflow-hidden",
        !isBoard && "cursor-grab active:cursor-grabbing",
        note.status === "archived" && "is-archived",
        note.status === "pinned" && "is-pinned",
        dragging && "z-[80] is-dragging",
        className
      )}
      style={paperStyle}
      onPointerDown={!isBoard ? onPointerDown : undefined}
      onPointerMove={!isBoard ? onPointerMove : undefined}
      onPointerUp={!isBoard ? onPointerUp : undefined}
      onPointerCancel={!isBoard ? onPointerCancel : undefined}
      onClick={onClick}
    >
      <div
        className="scratch-paper-accent"
        style={{ background: appearance.borderColor }}
        aria-hidden
      />
      {isBoard ? (
        <div
          className="scratch-paper-board-drag"
          onPointerDown={onDragStripPointerDown}
          onPointerMove={onDragStripPointerMove}
          onPointerUp={onDragStripPointerUp}
          onPointerCancel={onDragStripPointerCancel}
        >
          <GripHorizontal className="scratch-paper-board-grip" strokeWidth={2} />
        </div>
      ) : (
        <div className="scratch-paper-head">
          <span className="scratch-paper-pin-badge" style={{ color: appearance.pinColor }}>
            <StatusIcon className="size-3" strokeWidth={2.2} />
          </span>
          <span className="scratch-paper-status">{status.label}</span>
          {onDelete ? (
            <button
              type="button"
              className="scratch-paper-delete"
              aria-label="删除便签"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      )}
      {isBoard && onDelete ? (
        <button
          type="button"
          className="scratch-paper-delete scratch-paper-delete-board"
          aria-label="删除便签"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      {children}
    </div>
  )
})
