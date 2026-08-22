import { useCallback, useEffect, useRef, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { toast } from "sonner"

import { ScratchAppearancePanel } from "~/components/App/ScratchAppearancePanel"
import { ScratchNoteChrome } from "~/components/App/ScratchNoteChrome"
import { ScratchNoteShell } from "~/components/App/ScratchNoteShell"
import { ScratchStream } from "~/components/App/ScratchStream"
import { ThemeSync } from "~/components/App/ThemeSync"
import { TooltipProvider } from "~/components/ui/tooltip"
import { Toaster } from "~/components/ui/sonner"
import { dismissScratchWindow, destroyScratchWindow } from "~/lib/scratch"
import { promoteScratchToNote } from "~/lib/scratch-promote"
import type { ScratchNote } from "~/lib/scratch"
import {
  appearanceStyle,
  colorForPreset,
  resolveAppearance,
  type ScratchAppearance,
  type ScratchPresetId,
} from "~/lib/scratch-appearance"
import {
  emptyEntry,
  parseEntries,
  serializeEntries,
} from "~/lib/scratch-entries"
import { clipboardReadText } from "~/lib/workspace"
import { useScratchStore } from "~/store/scratch"
import { useWorkspaceStore } from "~/store/workspace"

interface Props {
  noteId: string
}

export const ScratchShell = ({ noteId }: Props) => {
  useEffect(() => {
    document.documentElement.classList.add("scratch-note-window")
    return () => {
      document.documentElement.classList.remove("scratch-note-window")
    }
  }, [])

  return (
    <TooltipProvider delay={200}>
      <ThemeSync />
      <ScratchPad noteId={noteId} />
      <Toaster />
    </TooltipProvider>
  )
}

const ScratchPad = ({ noteId }: Props) => {
  const notes = useScratchStore((state) => state.notes)
  const load = useScratchStore((state) => state.load)
  const upsert = useScratchStore((state) => state.upsert)
  const remove = useScratchStore((state) => state.remove)
  const initialize = useWorkspaceStore((state) => state.initialize)

  const note = notes.find((item) => item.id === noteId) ?? null
  const [entries, setEntries] = useState(() => parseEntries(""))
  const [preview, setPreview] = useState(false)
  const [lookOpen, setLookOpen] = useState(false)
  const [draftLook, setDraftLook] = useState<ScratchAppearance | null>(null)
  const [windowDragging, setWindowDragging] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<string | null>(null)
  const contentRef = useRef("")
  const noteRef = useRef<ScratchNote | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const geometryTimerRef = useRef<number | null>(null)
  const lookTimerRef = useRef<number | null>(null)
  const seededRef = useRef(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [load])

  useEffect(() => {
    noteRef.current = note
  }, [note])

  useEffect(() => {
    if (!note || seededRef.current) {
      return
    }
    seededRef.current = true
    const parsed = parseEntries(note.content)
    setEntries(parsed)
    contentRef.current = serializeEntries(parsed)
  }, [note])

  const flushSave = useCallback(async () => {
    const current = noteRef.current
    if (!current) {
      return
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (current.content === contentRef.current) {
      return
    }
    await upsert({
      ...current,
      content: contentRef.current,
      updatedAt: Date.now(),
    })
  }, [upsert])

  const requestClose = useCallback(() => {
    void flushSave()
    void dismissScratchWindow().catch(() => {
      window.__caelumCloseScratch?.()
    })
  }, [flushSave])

  const queueSave = useCallback(
    (value: string) => {
      contentRef.current = value
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null
        void flushSave()
      }, 280)
    },
    [flushSave]
  )

  const applyEntries = (next: typeof entries) => {
    setEntries(next)
    queueSave(serializeEntries(next))
  }

  useEffect(() => {
    let disposed = false
    let unlistenClose: (() => void) | undefined
    let unlistenMove: (() => void) | undefined
    let unlistenResize: (() => void) | undefined

    const timer = window.setTimeout(() => {
      if (disposed) {
        return
      }
      const win = getCurrentWindow()
      const persistGeometry = () => {
        if (geometryTimerRef.current) {
          window.clearTimeout(geometryTimerRef.current)
        }
        geometryTimerRef.current = window.setTimeout(() => {
          void (async () => {
            const current = noteRef.current
            if (!current) {
              return
            }
            try {
              const position = await win.outerPosition()
              const size = await win.innerSize()
              const scale = await win.scaleFactor()
              await upsert({
                ...current,
                content: contentRef.current,
                windowX: position.x / scale,
                windowY: position.y / scale,
                windowWidth: size.width / scale,
                windowHeight: size.height / scale,
                updatedAt: Date.now(),
              })
            } catch {
              // Browser preview ignores window geometry.
            }
          })()
        }, 240)
      }

      void win.onCloseRequested(() => {
        void flushSave()
      }).then((fn) => {
        if (disposed) {
          fn()
          return
        }
        unlistenClose = fn
      })
      void win.onMoved(persistGeometry).then((fn) => {
        if (disposed) {
          fn()
          return
        }
        unlistenMove = fn
      })
      void win.onResized(persistGeometry).then((fn) => {
        if (disposed) {
          fn()
          return
        }
        unlistenResize = fn
      })
    }, 0)

    return () => {
      disposed = true
      window.clearTimeout(timer)
      unlistenClose?.()
      unlistenMove?.()
      unlistenResize?.()
      if (geometryTimerRef.current) {
        window.clearTimeout(geometryTimerRef.current)
      }
    }
  }, [flushSave, upsert])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        if (lookOpen) {
          setLookOpen(false)
          setDraftLook(null)
          return
        }
        requestClose()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault()
        setPreview((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [lookOpen, requestClose])

  const commit = async (next: Partial<ScratchNote>) => {
    const current = noteRef.current
    if (!current) {
      return
    }
    await upsert({
      ...current,
      ...next,
      content: contentRef.current,
      updatedAt: Date.now(),
    })
  }

  const applyStatus = async (status: ScratchNote["status"]) => {
    if (!note) {
      return
    }
    const alwaysOnTop = status === "pinned"
    await commit({ status, alwaysOnTop })
    try {
      await getCurrentWindow().setAlwaysOnTop(alwaysOnTop)
    } catch {
      // ignore in browser preview
    }
  }

  const handlePromote = async () => {
    if (!note) {
      return
    }
    await flushSave()
    try {
      await initialize()
    } catch {
      // optional bootstrap
    }
    const latest = { ...note, content: contentRef.current }
    try {
      const result = await promoteScratchToNote(latest)
      toast.success("已写入笔记", { description: result.fileName })
    } catch (error) {
      toast.error("无法转入笔记", {
        description: error instanceof Error ? error.message : "写入失败",
      })
    }
  }

  const handlePaste = async () => {
    try {
      const text = await clipboardReadText()
      if (!text) {
        toast.message("剪贴板是空的")
        return
      }
      const incoming = parseEntries(text)
      const next =
        entries.length === 1 && !entries[0].text.trim()
          ? incoming
          : [...entries, ...incoming]
      applyEntries(next)
    } catch (error) {
      toast.error("无法粘贴", {
        description: error instanceof Error ? error.message : "读取剪贴板失败",
      })
    }
  }

  const addEntry = () => {
    const created = emptyEntry()
    applyEntries([...entries, created])
    setPendingFocus(created.id)
  }

  const viewNote = note ?? {
    id: noteId,
    content: "",
    status: "inbox" as const,
    color: "ivory" as const,
    appearance: undefined,
    x: 0,
    y: 0,
    width: 236,
    height: 248,
    zIndex: 1,
    alwaysOnTop: false,
    createdAt: Date.now(),
    updatedAt: 0,
    windowX: null,
    windowY: null,
    windowWidth: null,
    windowHeight: null,
  }

  const appearance = draftLook ?? resolveAppearance(viewNote)
  const look = appearanceStyle(appearance)
  const pinned = viewNote.status === "pinned" || viewNote.alwaysOnTop

  const applyAppearance = (next: ScratchAppearance) => {
    setDraftLook(next)
    if (lookTimerRef.current) {
      window.clearTimeout(lookTimerRef.current)
    }
    lookTimerRef.current = window.setTimeout(() => {
      lookTimerRef.current = null
      const preset = next.preset === "custom" ? "custom" : (next.preset as ScratchPresetId)
      void commit({
        appearance: next,
        color: colorForPreset(preset),
      })
    }, 50)
  }

  const closeLook = () => {
    if (lookTimerRef.current) {
      window.clearTimeout(lookTimerRef.current)
      lookTimerRef.current = null
    }
    if (draftLook) {
      const preset = draftLook.preset === "custom" ? "custom" : (draftLook.preset as ScratchPresetId)
      void commit({
        appearance: draftLook,
        color: colorForPreset(preset),
      })
    }
    setDraftLook(null)
    setLookOpen(false)
  }

  const handleDelete = () => {
    void (async () => {
      await flushSave()
      await remove(viewNote.id)
      try {
        await destroyScratchWindow()
      } catch {
        window.__caelumCloseScratch?.()
      }
    })()
  }

  return (
    <ScratchNoteShell
      appearance={appearance}
      style={look}
      windowDragging={windowDragging}
      sheet={
        lookOpen ? (
          <div className="scratch-look-scrim" onClick={closeLook}>
            <div className="scratch-look-drawer" onClick={(event) => event.stopPropagation()}>
              <ScratchAppearancePanel appearance={appearance} onChange={applyAppearance} onClose={closeLook} />
            </div>
          </div>
        ) : null
      }
    >
      <ScratchNoteChrome
        pinned={pinned}
        lookOpen={lookOpen}
        preview={preview}
        onPin={() => void applyStatus(pinned ? "inbox" : "pinned")}
        onLook={() => setLookOpen((value) => !value)}
        onPreview={() => setPreview((value) => !value)}
        onAdd={addEntry}
        onClose={() => {
          if (lookOpen) {
            setLookOpen(false)
            setDraftLook(null)
          }
          requestClose()
        }}
        onWindowDragStart={() => setWindowDragging(true)}
        onWindowDragEnd={() => setWindowDragging(false)}
        onArchive={() => void commit({ status: "archived", alwaysOnTop: false })}
        onPaste={() => void handlePaste()}
        onPromote={() => void handlePromote()}
        onDelete={handleDelete}
      />

      <ScratchStream
        entries={entries}
        onChange={applyEntries}
        preview={preview}
        pendingFocus={pendingFocus}
      />
    </ScratchNoteShell>
  )
}
