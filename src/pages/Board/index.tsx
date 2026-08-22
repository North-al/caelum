import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useNavigate } from "react-router"
import {
  Archive,
  ArrowLeft,
  FileInput,
  Pin,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { ScratchPaper } from "~/components/App/ScratchPaper"
import { WindowControls } from "~/layouts/components/WindowControls"
import { Button } from "~/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
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
  scratchPreview,
  type ScratchFilter,
  type ScratchNote,
} from "~/lib/scratch"
import {
  SCRATCH_PRESET_LABELS,
  SCRATCH_PRESET_ORDER,
  SCRATCH_PRESETS,
  colorForPreset,
  resolveAppearance,
  type ScratchPresetId,
} from "~/lib/scratch-appearance"
import { cn } from "~/lib/utils"
import { useScratchStore } from "~/store/scratch"

const FILTERS: Array<{ id: ScratchFilter; label: string }> = [
  { id: "active", label: "全部" },
  { id: "inbox", label: "待整理" },
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
  filter: ScratchFilter
}) => {
  const patch = useScratchStore((state) => state.patch)
  const create = useScratchStore((state) => state.create)
  const remove = useScratchStore((state) => state.remove)
  const openWindow = useScratchStore((state) => state.openWindow)
  const navigate = useNavigate()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScratchNote | null>(null)
  const sessionRef = useRef<DragSession | null>(null)
  const suppressClickRef = useRef(false)

  const visible = useMemo(
    () => notes.filter((note) => matchesScratchFilter(note, filter)),
    [filter, notes]
  )

  const bounds = useMemo(() => {
    let width = 1080
    let height = 720
    for (const note of visible) {
      width = Math.max(width, note.x + note.width + 120)
      height = Math.max(height, note.y + note.height + 140)
    }
    return { width, height }
  }, [visible])

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
    sessionRef.current = {
      id: note.id,
      originX: note.x,
      originY: note.y,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
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
    <>
      <div className="min-h-0 flex-1 overflow-auto pb-24 pt-10">
        <div
          className="relative min-h-full"
          style={{ minWidth: bounds.width, minHeight: bounds.height }}
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
          <div className="scratch-board-frame" aria-hidden />

          {empty ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm px-6 text-center">
                <p className="text-[16px] font-medium tracking-tight text-foreground/80">
                  {filter === "archived" ? "归档夹还是空的" : "板子上还没有纸条"}
                </p>
                <p className="mt-2 text-[12px] tracking-wide text-muted-foreground">
                  {filter === "archived"
                    ? "整理过的便签会出现在这里"
                    : "双击空白处贴一张，或按 Ctrl+Alt+N 随手记"}
                </p>
              </div>
            </div>
          ) : null}

          {visible.map((note) => {
            const preview = scratchPreview(note.content)
            const placed =
              livePos?.id === note.id ? { ...note, x: livePos.x, y: livePos.y } : note
            const appearance = resolveAppearance(note)
            return (
              <ContextMenu key={note.id}>
                <ContextMenuTrigger
                  render={
                    <ScratchPaper
                      note={placed}
                      dragging={draggingId === note.id}
                      onPointerDown={handlePointerDown(note)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={(event) => {
                        sessionRef.current = null
                        setDraggingId(null)
                        setLivePos(null)
                        try {
                          ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
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
                    />
                  }
                >
                  <div className="flex h-full flex-col px-4 pb-3.5 pt-7">
                    <div className="scratch-paper-title line-clamp-2 text-[14px] leading-snug">
                      {preview.title}
                    </div>
                    {preview.body ? (
                      <p className="scratch-paper-body mt-2 line-clamp-7 whitespace-pre-wrap text-[12.5px] leading-relaxed">
                        {preview.body}
                      </p>
                    ) : (
                      <p className="scratch-paper-body mt-2 text-[12px] italic opacity-70">
                        {preview.empty ? "还没写字" : ""}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2 text-[10px] tracking-wide text-[color:var(--paper-muted)] opacity-75">
                      <span>
                        {note.status === "pinned"
                          ? "常驻"
                          : note.status === "archived"
                            ? "归档"
                            : "待整理"}
                      </span>
                      <span>{SCRATCH_PRESET_LABELS[appearance.preset]}</span>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => void openWindow(note.id)}>打开纸条</ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      void patch(note.id, {
                        status: note.status === "pinned" ? "inbox" : "pinned",
                        alwaysOnTop: note.status !== "pinned",
                      })
                    }
                  >
                    <Pin className="size-4" />
                    {note.status === "pinned" ? "改为待整理" : "设为常驻"}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      void patch(note.id, {
                        status: note.status === "archived" ? "inbox" : "archived",
                        alwaysOnTop: false,
                      })
                    }
                  >
                    <Archive className="size-4" />
                    {note.status === "archived" ? "移出归档" : "归档"}
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
                  <ContextMenuItem variant="destructive" onClick={() => setDeleteTarget(note)}>
                    <Trash2 className="size-4" />
                    删除
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撕掉这张纸条？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复。若只需移出视线，可以先归档。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  void remove(deleteTarget.id)
                }
                setDeleteTarget(null)
              }}
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const BoardPage = () => {
  const load = useScratchStore((state) => state.load)
  const notes = useScratchStore((state) => state.notes)
  const create = useScratchStore((state) => state.create)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<ScratchFilter>("active")

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
      if (document.querySelector("[data-slot='alert-dialog-content']")) {
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
      inbox: notes.filter((note) => note.status === "inbox").length,
      pinned: notes.filter((note) => note.status === "pinned").length,
      archived: notes.filter((note) => note.status === "archived").length,
    }),
    [notes]
  )

  const handleCreate = useCallback(() => {
    void create({ open: true })
  }, [create])

  const goWorkspace = () => navigate("/")

  return (
    <div className="scratch-board-page">
      <header className="scratch-board-chrome">
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-8 rounded-lg px-2 text-[12.5px] text-muted-foreground hover:text-foreground"
          onClick={goWorkspace}
        >
          <ArrowLeft className="size-3.5" />
          工作区
        </Button>
        <div className="min-w-2 flex-1 self-stretch px-3" data-tauri-drag-region>
          <div className="flex h-full items-center gap-2 text-[13px] font-medium tracking-tight text-foreground">
            便签板
            <span className="hidden text-[11px] font-normal tracking-wide text-muted-foreground sm:inline">
              Esc 返回
            </span>
          </div>
        </div>
        <WindowControls />
      </header>

      <BoardCanvas notes={notes} filter={filter} />

      <div className="scratch-board-dock" role="toolbar" aria-label="便签板操作">
        <button type="button" className="scratch-board-new" onClick={handleCreate}>
          <span className="inline-flex items-center gap-1">
            <Plus className="size-3.5" strokeWidth={2.2} />
            新建卡片
          </span>
        </button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn("scratch-board-chip", filter === item.id && "is-active")}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span className="ml-1 tabular-nums text-[10px] opacity-60">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={cn("scratch-archive-fab", filter === "archived" && "is-active")}
        aria-label="归档"
        onClick={() => setFilter(filter === "archived" ? "active" : "archived")}
      >
        <Archive className="size-4" strokeWidth={1.85} />
        <span className="text-[9px] font-medium tracking-wide">{counts.archived}</span>
      </button>
    </div>
  )
}

export default BoardPage
