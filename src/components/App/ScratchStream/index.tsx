import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { toast } from "sonner"

import { GlassStreamRow } from "~/components/App/GlassStream"
import {
  emptyEntry,
  parseEntry,
  serializeEntry,
  type ScratchEntry,
} from "~/lib/scratch-entries"
import { writeTextToClipboard } from "~/lib/workspace"
import { cn } from "~/lib/utils"

interface Props {
  entries: ScratchEntry[]
  onChange: (next: ScratchEntry[]) => void
  preview?: boolean
  pendingFocus?: string | null
}

const TAG_TONES = [
  "bg-[#ece4fb] text-[#6b4da8]",
  "bg-[#dceee4] text-[#2f6d4f]",
  "bg-[#fde6d4] text-[#9a4b1c]",
  "bg-[#dce8f8] text-[#355d9a]",
  "bg-[#f8dce8] text-[#9a3d62]",
]

const FLIP_TRANSITION = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)"

const toneFor = (tag: string) => {
  let hash = 0
  for (let index = 0; index < tag.length; index += 1) {
    hash = (hash + tag.charCodeAt(index) * (index + 3)) % TAG_TONES.length
  }
  return TAG_TONES[hash]
}

const commitLine = (entry: ScratchEntry, text: string): ScratchEntry => {
  return parseEntry(serializeEntry({ ...entry, text }), entry.id)
}

export const ScratchStream = ({ entries, onChange, preview, pendingFocus }: Props) => {
  const [focusId, setFocusId] = useState<string | null>(entries[0]?.id ?? null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; startY: number } | null>(null)
  const reorderLockRef = useRef(false)

  useEffect(() => {
    if (pendingFocus) {
      setFocusId(pendingFocus)
    }
  }, [pendingFocus])

  useEffect(() => {
    if (!focusId) {
      return
    }
    const node = inputRefs.current[focusId]
    if (node) {
      node.focus()
      const end = node.value.length
      node.setSelectionRange(end, end)
    }
  }, [focusId])

  const replace = (id: string, next: ScratchEntry) => {
    onChange(entries.map((entry) => (entry.id === id ? next : entry)))
  }

  const remove = (id: string) => {
    if (entries.length === 1) {
      onChange([emptyEntry()])
      return
    }
    const index = entries.findIndex((entry) => entry.id === id)
    const next = entries.filter((entry) => entry.id !== id)
    onChange(next)
    setFocusId(next[Math.max(0, index - 1)]?.id ?? next[0]?.id ?? null)
  }

  const insertAfter = (id: string, seed = "") => {
    const created = commitLine(emptyEntry(), seed)
    const index = entries.findIndex((entry) => entry.id === id)
    const next = [...entries.slice(0, index + 1), created, ...entries.slice(index + 1)]
    onChange(next)
    setFocusId(created.id)
  }

  const toggleTask = (entry: ScratchEntry) => {
    if (entry.kind === "heading") {
      return
    }
    const next = {
      ...entry,
      kind: "task" as const,
      checked: entry.kind === "task" ? !entry.checked : false,
    }
    replace(entry.id, { ...next, raw: serializeEntry(next) })
  }

  const handleKey = (entry: ScratchEntry, index: number) => (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const caret = event.currentTarget.selectionStart ?? entry.text.length
      const before = entry.text.slice(0, caret)
      const after = entry.text.slice(caret)
      replace(entry.id, commitLine(entry, before))
      insertAfter(entry.id, after)
      return
    }
    if (event.key === "Backspace" && entry.text.length === 0 && entries.length > 1) {
      event.preventDefault()
      remove(entry.id)
      return
    }
    if (event.key === "ArrowUp" && index > 0 && event.currentTarget.selectionStart === 0) {
      event.preventDefault()
      setFocusId(entries[index - 1].id)
    }
    if (
      event.key === "ArrowDown" &&
      index < entries.length - 1 &&
      event.currentTarget.selectionStart === entry.text.length
    ) {
      event.preventDefault()
      setFocusId(entries[index + 1].id)
    }
  }

  const flipReorder = (fromId: string, overId: string, clientY: number) => {
    if (fromId === overId || reorderLockRef.current) {
      return
    }

    const from = entries.findIndex((entry) => entry.id === fromId)
    const to = entries.findIndex((entry) => entry.id === overId)
    if (from < 0 || to < 0) {
      return
    }

    const list = listRef.current
    let targetIndex = to
    if (list) {
      const over = list.querySelector<HTMLElement>(`[data-entry-id="${overId}"]`)
      if (over) {
        const rect = over.getBoundingClientRect()
        const insertBefore = clientY < rect.top + rect.height / 2
        targetIndex = insertBefore ? to : to + 1
        if (from < targetIndex) {
          targetIndex -= 1
        }
      }
    }

    if (from === targetIndex) {
      return
    }

    reorderLockRef.current = true

    const positions = new Map<string, number>()
    if (list) {
      list.querySelectorAll<HTMLElement>("[data-entry-id]").forEach((row) => {
        const id = row.dataset.entryId
        if (id) {
          positions.set(id, row.getBoundingClientRect().top)
        }
      })
    }

    const next = [...entries]
    const [moved] = next.splice(from, 1)
    next.splice(targetIndex, 0, moved)
    onChange(next)

    requestAnimationFrame(() => {
      if (list) {
        list.querySelectorAll<HTMLElement>("[data-entry-id]").forEach((row) => {
          const id = row.dataset.entryId
          if (!id || id === fromId) {
            return
          }
          const prev = positions.get(id)
          if (prev === undefined) {
            return
          }
          const now = row.getBoundingClientRect().top
          const delta = prev - now
          if (Math.abs(delta) < 0.5) {
            return
          }
          row.style.transform = `translateY(${delta}px)`
          row.style.transition = "none"
          requestAnimationFrame(() => {
            row.style.transition = FLIP_TRANSITION
            row.style.transform = ""
          })
        })
      }
      reorderLockRef.current = false
    })
  }

  const handleGripDown = (id: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id, startY: event.clientY }
    setDraggingId(id)
    setDragOffsetY(0)
  }

  const handleGripMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = dragRef.current
    if (!session) {
      return
    }

    setDragOffsetY(event.clientY - session.startY)

    const list = listRef.current
    if (!list) {
      return
    }

    const rows = [...list.querySelectorAll<HTMLElement>("[data-entry-id]")]
    const over = rows.find((row) => {
      const rect = row.getBoundingClientRect()
      return event.clientY >= rect.top && event.clientY <= rect.bottom
    })

    if (over?.dataset.entryId) {
      flipReorder(session.id, over.dataset.entryId, event.clientY)
    }
  }

  const handleGripUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = null
    setDraggingId(null)
    setDragOffsetY(0)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  const copyLine = async (text: string) => {
    if (!text.trim()) {
      toast.message("没有内容可复制")
      return
    }
    try {
      await writeTextToClipboard(text)
      toast.success("已复制到剪贴板")
    } catch (error) {
      toast.error("复制失败", {
        description: error instanceof Error ? error.message : "无法写入剪贴板",
      })
    }
  }

  const showGrip = entries.length > 1

  return (
    <div ref={listRef} className="scratch-note-list glass-stream-list">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          data-entry-id={entry.id}
          className={cn("scratch-note-row-wrap glass-stream-row-wrap", draggingId === entry.id && "is-dragging")}
          style={
            draggingId === entry.id
              ? { transform: `translateY(${dragOffsetY}px) scale(1.02)` }
              : undefined
          }
        >
          <GlassStreamRow
            active={focusId === entry.id}
            dragging={draggingId === entry.id}
            done={entry.checked}
            heading={entry.kind === "heading"}
            showGrip={showGrip}
            preview={preview}
            placeholder={index === 0 && entries.length === 1 ? "写下一件要记住的事" : "继续记…"}
            value={entry.text}
            tags={entry.tags}
            tagTone={toneFor}
            checked={entry.kind === "task" && entry.checked}
            inputRef={(node) => {
              inputRefs.current[entry.id] = node
            }}
            onFocus={() => setFocusId(entry.id)}
            onChange={(text) => replace(entry.id, commitLine(entry, text))}
            onKeyDown={handleKey(entry, index)}
            onToggleCheck={() => toggleTask(entry)}
            onCopy={() => void copyLine(entry.text)}
            onRemove={() => remove(entry.id)}
            onGripDown={handleGripDown(entry.id)}
            onGripMove={handleGripMove}
            onGripUp={handleGripUp}
          />
        </div>
      ))}
    </div>
  )
}
