import { useCallback, useEffect, useRef, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { ScratchAppearancePanel } from "~/components/App/ScratchAppearancePanel"
import { ScratchNoteChrome } from "~/components/App/ScratchNoteChrome"
import { ScratchNoteShell } from "~/components/App/ScratchNoteShell"
import { ScratchStream } from "~/components/App/ScratchStream"
import { ThemeSync } from "~/components/App/ThemeSync"
import { TooltipProvider } from "~/components/ui/tooltip"
import { Toaster } from "~/components/ui/sonner"
import { dismissScratchWindow } from "~/lib/scratch"
import type { ScratchEditorMode, ScratchNote } from "~/lib/scratch"
import { resolveEditorMode } from "~/lib/scratch"
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
import { useScratchStore } from "~/store/scratch"

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

  const note = notes.find((item) => item.id === noteId) ?? null
  const [editorMode, setEditorMode] = useState<ScratchEditorMode>("todo")
  const [entries, setEntries] = useState(() => parseEntries(""))
  const [memoText, setMemoText] = useState("")
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
    const mode = resolveEditorMode(note)
    setEditorMode(mode)
    if (mode === "memo") {
      setMemoText(note.content)
      contentRef.current = note.content
      setEntries(parseEntries(""))
    } else {
      const parsed = parseEntries(note.content)
      setEntries(parsed)
      contentRef.current = serializeEntries(parsed)
    }
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
      editorMode,
      updatedAt: Date.now(),
    })
  }, [editorMode, upsert])

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

  const applyMemo = (value: string) => {
    setMemoText(value)
    queueSave(value)
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
                editorMode,
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
  }, [editorMode, flushSave, upsert])

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
      if (
        editorMode === "memo" &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "enter"
      ) {
        event.preventDefault()
        setPreview((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editorMode, lookOpen, requestClose])

  const commit = async (next: Partial<ScratchNote>) => {
    const current = noteRef.current
    if (!current) {
      return
    }
    await upsert({
      ...current,
      ...next,
      content: contentRef.current,
      editorMode,
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

  const switchEditorMode = async (mode: ScratchEditorMode) => {
    if (mode === editorMode) {
      return
    }
    await flushSave()
    if (mode === "memo") {
      const text =
        editorMode === "todo" ? serializeEntries(entries) : memoText
      setMemoText(text)
      contentRef.current = text
      setPreview(false)
    } else {
      const text = editorMode === "memo" ? memoText : serializeEntries(entries)
      const parsed = parseEntries(text)
      setEntries(parsed.length ? parsed : [emptyEntry()])
      contentRef.current = serializeEntries(parsed.length ? parsed : [emptyEntry()])
      setPreview(false)
    }
    setEditorMode(mode)
    await commit({ editorMode: mode })
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
    editorMode: "todo" as const,
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
        editorMode={editorMode}
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
        onEditorModeChange={(mode) => void switchEditorMode(mode)}
        onWindowDragStart={() => setWindowDragging(true)}
        onWindowDragEnd={() => setWindowDragging(false)}
      >
        {editorMode === "todo" ? (
          <ScratchStream
            entries={entries}
            onChange={applyEntries}
            pendingFocus={pendingFocus}
          />
        ) : preview ? (
          <pre className="scratch-memo-read">{memoText.trim() || "空白便签"}</pre>
        ) : (
          <textarea
            className="scratch-memo-input"
            value={memoText}
            placeholder="写下一段备忘…"
            onChange={(event) => applyMemo(event.target.value)}
          />
        )}
      </ScratchNoteChrome>
    </ScratchNoteShell>
  )
}
