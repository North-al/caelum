import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"

import { FileTypeIcon } from "~/components/App/FileTypeIcon"
import type { FileNode } from "~/components/App/FileTree/types"
import {
  clampPanelPosition,
  defaultCenteredPosition,
  resolvePanelPosition,
  type PanelPosition,
} from "~/lib/floating-panel"
import { getParentPath, normalizePath } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

export interface QuickOpenFile {
  path: string
  name: string
  dir: string
  recent: boolean
}

const flattenFiles = (nodes: FileNode[], notesPath: string): QuickOpenFile[] => {
  const root = normalizePath(notesPath).replace(/\/+$/, "")
  const files: QuickOpenFile[] = []

  const walk = (list: FileNode[]) => {
    for (const node of list) {
      if (node.type === "folder") {
        walk(node.children ?? [])
        continue
      }
      const path = normalizePath(node.path)
      const parent = getParentPath(path)
      let dir = parent
      if (root && (parent === root || parent.startsWith(`${root}/`))) {
        dir = parent.slice(root.length).replace(/^\//, "") || "."
      }
      files.push({
        path,
        name: node.name,
        dir: dir.replace(/\//g, "\\"),
        recent: false,
      })
    }
  }

  walk(nodes)
  return files
}

const scoreMatch = (file: QuickOpenFile, query: string) => {
  const q = query.trim().toLowerCase()
  if (!q) return file.recent ? 2 : 1
  const name = file.name.toLowerCase()
  const path = `${file.dir}\\${file.name}`.toLowerCase()
  if (name === q) return 1000
  if (name.startsWith(q)) return 800
  if (name.includes(q)) return 600
  if (path.includes(q)) return 400
  // subsequence fuzzy
  let qi = 0
  for (let i = 0; i < name.length && qi < q.length; i += 1) {
    if (name[i] === q[qi]) qi += 1
  }
  if (qi === q.length) return 200
  return 0
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const QuickOpen = ({ open, onOpenChange }: Props) => {
  const tree = useWorkspaceStore((s) => s.tree)
  const notesPath = useWorkspaceStore((s) => s.config?.notesPath ?? "")
  const openFiles = useWorkspaceStore((s) => s.openFiles)
  const selectedFilePath = useWorkspaceStore((s) => s.selectedFilePath)
  const storedPos = useWorkspaceStore((s) => s.config?.uiState.quickOpenPosition ?? null)
  const selectFile = useWorkspaceStore((s) => s.selectFile)
  const updateUiState = useWorkspaceStore((s) => s.updateUiState)

  const panelRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    active: boolean
    startX: number
    startY: number
    originLeft: number
    originTop: number
  } | null>(null)

  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const [pos, setPos] = useState<PanelPosition | null>(null)

  const allFiles = useMemo(() => {
    if (!notesPath) return []
    const flat = flattenFiles(tree, notesPath)
    const recentSet = new Set(openFiles.map((p) => normalizePath(p)))
    const recent = openFiles
      .map((path) => {
        const normalized = normalizePath(path)
        const hit = flat.find((f) => f.path === normalized)
        if (hit) return { ...hit, recent: true }
        const name = normalized.split("/").pop() ?? normalized
        return {
          path: normalized,
          name,
          dir: getParentPath(normalized).replace(/\//g, "\\"),
          recent: true,
        }
      })
      .filter((f, i, arr) => arr.findIndex((x) => x.path === f.path) === i)

    const rest = flat.filter((f) => !recentSet.has(f.path))
    return [...recent, ...rest]
  }, [tree, notesPath, openFiles])

  const results = useMemo(() => {
    const ranked = allFiles
      .map((file) => ({ file, score: scoreMatch(file, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name, "zh-CN"))
      .map((item) => item.file)
    return ranked.slice(0, 80)
  }, [allFiles, query])

  useEffect(() => {
    if (!open) return
    setQuery("")
    setIndex(0)
    requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const size = { width: panel.offsetWidth || 560, height: panel.offsetHeight || 420 }
      const next = resolvePanelPosition(storedPos, size, () =>
        defaultCenteredPosition(size.width, size.height, 0.32)
      )
      setPos(next)
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [open, storedPos])

  useEffect(() => {
    setIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-quick-index="${index}"]`)
    row?.scrollIntoView({ block: "nearest" })
  }, [index, open, results])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onOpenChange(false)
        return
      }
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setIndex((prev) => Math.min(results.length - 1, prev + 1))
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setIndex((prev) => Math.max(0, prev - 1))
        return
      }
      if (event.key === "Enter") {
        event.preventDefault()
        const file = results[index]
        if (file) {
          void selectFile(file.path)
          onOpenChange(false)
        }
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, results, index, selectFile, onOpenChange])

  useEffect(() => {
    if (!open) return
    const onResize = () => {
      const panel = panelRef.current
      if (!panel || !pos) return
      const next = clampPanelPosition(
        pos.left,
        pos.top,
        panel.offsetWidth,
        panel.offsetHeight
      )
      setPos(next)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [open, pos])

  if (!open) return null

  const openSelected = (path: string) => {
    void selectFile(path)
    onOpenChange(false)
  }

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest("input, button, [data-no-drag]")) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onHandlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const panel = panelRef.current
    if (!drag?.active || !panel) return
    const next = clampPanelPosition(
      drag.originLeft + (event.clientX - drag.startX),
      drag.originTop + (event.clientY - drag.startY),
      panel.offsetWidth,
      panel.offsetHeight
    )
    setPos(next)
  }

  const onHandlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag?.active) return
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const next = clampPanelPosition(rect.left, rect.top, rect.width, rect.height)
    setPos(next)
    void updateUiState({ quickOpenPosition: next })
  }

  return (
    <div className="fixed inset-0 z-[90]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/25"
        aria-label="关闭快速打开"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="快速打开"
        className="absolute flex w-[min(560px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)]"
        style={
          pos
            ? { left: pos.left, top: pos.top }
            : { left: "50%", top: "28%", transform: "translate(-50%, 0)" }
        }
      >
        <div
          ref={handleRef}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex cursor-grab items-center gap-2 border-b border-border/50 px-3 py-2.5 active:cursor-grabbing"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            data-no-drag
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文件名或路径…"
            className="h-8 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/70"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="hidden rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[min(52vh,420px)] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              没有匹配的文件
            </div>
          ) : (
            results.map((file, i) => {
              const active = i === index
              const current = selectedFilePath
                ? normalizePath(selectedFilePath) === file.path
                : false
              return (
                <button
                  key={file.path}
                  type="button"
                  data-quick-index={i}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => openSelected(file.path)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    active ? "bg-muted/80" : "hover:bg-muted/40"
                  )}
                >
                  <FileTypeIcon path={file.path} className="size-4" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[13px] font-medium text-foreground">{file.name}</span>
                    <span className="ml-2 text-[12px] text-muted-foreground">{file.dir}</span>
                  </span>
                  {file.recent ? (
                    <span className="shrink-0 text-[11px] text-muted-foreground">最近打开</span>
                  ) : null}
                  {current ? (
                    <span className="shrink-0 text-[11px] text-primary/80">当前</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
