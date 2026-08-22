import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
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

const DEFAULT_ROW_HEIGHT = 36

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

const rowShift = (
  index: number,
  fromIndex: number,
  dropIndex: number | null,
  rowHeight: number
) => {
  if (dropIndex === null || fromIndex === dropIndex) {
    return 0
  }
  if (fromIndex < dropIndex) {
    if (index > fromIndex && index <= dropIndex) {
      return -rowHeight
    }
  } else if (index >= dropIndex && index < fromIndex) {
    return rowHeight
  }
  return 0
}

export const ScratchStream = ({ entries, onChange, preview, pendingFocus }: Props) => {
  const [focusId, setFocusId] = useState<string | null>(entries[0]?.id ?? null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; startY: number } | null>(null)
  const rowHeightRef = useRef(DEFAULT_ROW_HEIGHT)

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

  useEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }
    const row = list.querySelector<HTMLElement>("[data-entry-id]")
    if (row) {
      rowHeightRef.current = row.getBoundingClientRect().height || DEFAULT_ROW_HEIGHT
    }
  }, [entries.length])

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

  const addAtEnd = () => {
    const created = emptyEntry()
    onChange([...entries, created])
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

  const resolveInsertIndex = (clientY: number, dragId: string, offsetY: number) => {
    const list = listRef.current
    if (!list) {
      return 0
    }

    const rows = [...list.querySelectorAll<HTMLElement>("[data-entry-id]")]
    const rowHeight = rowHeightRef.current

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const rect = row.getBoundingClientRect()
      const top = row.dataset.entryId === dragId ? rect.top - offsetY : rect.top
      if (clientY < top + rowHeight / 2) {
        return index
      }
    }

    return rows.length
  }

  const commitReorder = (fromId: string, insertIndex: number) => {
    const from = entries.findIndex((entry) => entry.id === fromId)
    if (from < 0) {
      return
    }

    let targetIndex = Math.max(0, Math.min(insertIndex, entries.length))
    if (from < targetIndex) {
      targetIndex -= 1
    }
    if (from === targetIndex) {
      return
    }

    const next = [...entries]
    const [moved] = next.splice(from, 1)
    next.splice(targetIndex, 0, moved)
    onChange(next)
  }

  const handleGripDown = (id: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const list = listRef.current
    if (list) {
      const row = list.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)
      if (row) {
        rowHeightRef.current = row.getBoundingClientRect().height || DEFAULT_ROW_HEIGHT
      }
    }
    dragRef.current = { id, startY: event.clientY }
    setDraggingId(id)
    setDragOffsetY(0)
    setDropIndex(entries.findIndex((entry) => entry.id === id))
  }

  const handleGripMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = dragRef.current
    if (!session) {
      return
    }

    const offsetY = event.clientY - session.startY
    setDragOffsetY(offsetY)
    setDropIndex(resolveInsertIndex(event.clientY, session.id, offsetY))
  }

  const handleGripUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = dragRef.current
    if (session && dropIndex !== null) {
      commitReorder(session.id, dropIndex)
    }
    dragRef.current = null
    setDraggingId(null)
    setDragOffsetY(0)
    setDropIndex(null)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  const copyLine = async (text: string) => {
    if (!text.trim()) {
      return
    }
    try {
      await writeTextToClipboard(text)
    } catch (error) {
      toast.error("复制失败", {
        description: error instanceof Error ? error.message : "无法写入剪贴板",
      })
    }
  }

  const showGrip = entries.length > 1
  const fromIndex = draggingId ? entries.findIndex((entry) => entry.id === draggingId) : -1
  const rowHeight = rowHeightRef.current

  return (
    <div
      ref={listRef}
      className="scratch-note-list glass-stream-list"
      onDoubleClick={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        addAtEnd()
      }}
    >
      {entries.map((entry, index) => {
        const isDragging = draggingId === entry.id
        const shiftY = isDragging
          ? dragOffsetY
          : rowShift(index, fromIndex, dropIndex, rowHeight)
        const dragStyle: CSSProperties | undefined =
          isDragging || shiftY !== 0
            ? {
                transform: isDragging
                  ? `translateY(${dragOffsetY}px) scale(1.02)`
                  : `translateY(${shiftY}px)`,
              }
            : undefined

        return (
          <div
            key={entry.id}
            data-entry-id={entry.id}
            className={cn(
              "scratch-note-row-wrap glass-stream-row-wrap",
              isDragging && "is-dragging",
              dropIndex === index && draggingId && draggingId !== entry.id && "is-drop-target"
            )}
            style={dragStyle}
          >
            <GlassStreamRow
              active={focusId === entry.id}
              dragging={isDragging}
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
        )
      })}
    </div>
  )
}
