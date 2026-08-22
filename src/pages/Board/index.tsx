import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useNavigate } from "react-router"
import { ArrowLeft, FileInput, Pin, Plus, StickyNote } from "lucide-react"
import { toast } from "sonner"

import { ScratchPaper } from "~/components/App/ScratchPaper"
import { WindowControls } from "~/layouts/components/WindowControls"
import { Button } from "~/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import { promoteScratchToNote } from "~/lib/scratch-promote"
import {
  matchesScratchFilter,
  type ScratchNote,
} from "~/lib/scratch"
import {
  SCRATCH_PRESET_LABELS,
  SCRATCH_PRESET_ORDER,
  SCRATCH_PRESETS,
  colorForPreset,
  type ScratchPresetId,
} from "~/lib/scratch-appearance"
import { cn } from "~/lib/utils"
import { useScratchStore } from "~/store/scratch"

type BoardFilter = "active" | "pinned"

const FILTERS: Array<{ id: BoardFilter; label: string }> = [
  { id: "active", label: "全部" },
  { id: "pinned", label: "常驻" },
]

interface DragSession {
  id: string
  originX: number
  originY: number
  startX: number
  startY: number
  pointerId: number
  moved: boolean
}

const BoardCanvas = ({
  notes,
  filter,
}: {
  notes: ScratchNote[]
  filter: BoardFilter
}) => {
  const patch = useScratchStore((state) => state.patch)
  const create = useScratchStore((state) => state.create)
  const remove = useScratchStore((state) => state.remove)
  const openWindow = useScratchStore((state) => state.openWindow)
  const navigate = useNavigate()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null)
  const sessionRef = useRef<DragSession | null>(null)
  const suppressClickRef = useRef(false)

  const visible = useMemo(
    () => notes.filter((note) => matchesScratchFilter(note, filter)),
    [filter, notes]
  )

  const maxZ = notes.reduce((max, note) => Math.max(max, note.zIndex), 0)

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current
    sessionRef.current = null
    setDraggingId(null)
    setLivePos(null)
    if (!session) {
      return
    }
    if (session.moved) {
      suppressClickRef.current = true
      const nextX = Math.max(16, session.originX + (event.clientX - session.startX))
      const nextY = Math.max(28, session.originY + (event.clientY - session.startY))
      void patch(session.id, { x: nextX, y: nextY, zIndex: maxZ + 1 })
    }
  }

  const handlePointerDown = (note: ScratchNote) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    event.stopPropagation()
    sessionRef.current = {
      id: note.id,
      originX: note.x,
      originY: note.y,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) {
      return
    }
    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY)
    if (!session.moved && distance > 5) {
      session.moved = true
      setDraggingId(session.id)
    }
    if (!session.moved) {
      return
    }
    setLivePos({
      id: session.id,
      x: Math.max(16, session.originX + (event.clientX - session.startX)),
      y: Math.max(28, session.originY + (event.clientY - session.startY)),
    })
  }

  const applyPreset = (note: ScratchNote, preset: ScratchPresetId) => {
    void patch(note.id, {
      color: colorForPreset(preset),
      appearance: { ...SCRATCH_PRESETS[preset] },
    })
  }

  const handleDelete = (note: ScratchNote) => {
    void remove(note.id)
  }

  const handlePromote = async (note: ScratchNote) => {
    try {
      const result = await promoteScratchToNote(note)
      toast.success("已写入笔记", { description: result.fileName })
      navigate("/")
    } catch (error) {
      toast.error("无法转入笔记", {
        description: error instanceof Error ? error.message : "写入失败",
      })
    }
  }

  const empty = visible.length === 0

  return (
    <div className="scratch-board-canvas">
      <div
        className="scratch-board-surface"
        onDoubleClick={(event) => {
          if (event.target !== event.currentTarget) {
            return
          }
          const rect = event.currentTarget.getBoundingClientRect()
          const x = Math.max(24, event.clientX - rect.left - 118)
          const y = Math.max(36, event.clientY - rect.top - 24)
          void create({ x, y, open: true })
        }}
      >
        {empty ? (
          <div className="scratch-board-empty">
            <StickyNote className="scratch-board-empty-icon" strokeWidth={1.4} />
            <p className="scratch-board-empty-hint">
              {filter === "pinned" ? "还没有常驻便签" : "双击空白处贴一张"}
            </p>
          </div>
        ) : null}

        {visible.map((note) => {
          const placed =
            livePos?.id === note.id ? { ...note, x: livePos.x, y: livePos.y } : note
          const previewText = note.content.trim() || "…"
          return (
            <div
              key={note.id}
              className="scratch-paper-wrap"
              style={{
                position: "absolute",
                left: placed.x,
                top: placed.y,
                width: placed.width,
                height: placed.height,
                zIndex: draggingId === note.id ? 80 : note.zIndex + 1,
              }}
            >
              <ContextMenu>
                <ContextMenuTrigger className="block h-full w-full">
                  <ScratchPaper
                    variant="board"
                    note={placed}
                    dragging={draggingId === note.id}
                    className="h-full w-full"
                    onDelete={() => handleDelete(note)}
                    onDragStripPointerDown={handlePointerDown(note)}
                    onDragStripPointerMove={handlePointerMove}
                    onDragStripPointerUp={finishDrag}
                    onDragStripPointerCancel={(event) => {
                      sessionRef.current = null
                      setDraggingId(null)
                      setLivePos(null)
                      try {
                        event.currentTarget.releasePointerCapture(event.pointerId)
                      } catch {
                        // ignore
                      }
                    }}
                    onClick={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false
                        return
                      }
                      void openWindow(note.id)
                    }}
                  >
                    <pre className="scratch-paper-preview">{previewText}</pre>
                  </ScratchPaper>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => void openWindow(note.id)}>打开编辑</ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      void patch(note.id, {
                        status: note.status === "pinned" ? "inbox" : "pinned",
                        alwaysOnTop: note.status !== "pinned",
                      })
                    }
                  >
                    <Pin className="size-4" />
                    {note.status === "pinned" ? "取消常驻" : "设为常驻"}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => void handlePromote(note)}>
                    <FileInput className="size-4" />
                    写入正式笔记
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {SCRATCH_PRESET_ORDER.map((preset) => (
                    <ContextMenuItem key={preset} onClick={() => applyPreset(note, preset)}>
                      <span
                        className="size-3.5 rounded-full ring-1 ring-black/10"
                        style={{ background: SCRATCH_PRESETS[preset].background }}
                      />
                      {SCRATCH_PRESET_LABELS[preset]}
                    </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem variant="destructive" onClick={() => handleDelete(note)}>
                    删除
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const BoardPage = () => {
  const load = useScratchStore((state) => state.load)
  const notes = useScratchStore((state) => state.notes)
  const create = useScratchStore((state) => state.create)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<BoardFilter>("active")

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return
      }
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return
      }
      event.preventDefault()
      navigate("/")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate])

  const counts = useMemo(
    () => ({
      active: notes.filter((note) => note.status !== "archived").length,
      pinned: notes.filter((note) => note.status === "pinned").length,
    }),
    [notes]
  )

  const handleCreate = useCallback(() => {
    void create({ open: true })
  }, [create])

  const goWorkspace = () => navigate("/")

  return (
    <div className="scratch-board-page">
      <header className="scratch-board-chrome" data-tauri-drag-region>
        <div className="scratch-board-chrome-side scratch-board-chrome-no-drag">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg px-2 text-[12.5px] text-muted-foreground hover:text-foreground"
            onClick={goWorkspace}
          >
            <ArrowLeft className="size-3.5" />
            工作区
          </Button>
        </div>
        <div className="scratch-board-chrome-center" data-tauri-drag-region>
          <span className="text-[13px] font-medium tracking-tight text-foreground">便签板</span>
        </div>
        <div className="scratch-board-chrome-side scratch-board-chrome-no-drag scratch-board-chrome-actions">
          <div className="scratch-board-toolbar" aria-label="便签板操作">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("scratch-board-toolbar-chip", filter === item.id && "is-active")}
                onClick={() => setFilter(item.id)}
              >
                <span>{item.label}</span>
                <span className="scratch-board-toolbar-count">{counts[item.id]}</span>
              </button>
            ))}
            <span className="scratch-board-toolbar-divider" aria-hidden />
            <button
              type="button"
              className="scratch-board-toolbar-new"
              title="新建便签"
              aria-label="新建便签"
              onClick={handleCreate}
            >
              <Plus className="size-3.5" strokeWidth={2.2} />
            </button>
          </div>
          <WindowControls />
        </div>
      </header>

      <div className="scratch-board-main">
        <BoardCanvas notes={notes} filter={filter} />
      </div>
    </div>
  )
}

export default BoardPage
