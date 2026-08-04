import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent } from "react"
import { ClipboardPaste, FilePlus2, FolderPlus } from "lucide-react"
import { toast } from "sonner"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import {
  DROP_DIR_ATTR,
  EXPLORER_ZONE_ATTR,
  getActiveDropDir,
  getActiveTabDragPath,
  subscribeTabDrag,
} from "~/lib/dnd"
import { getExplorerClipboardPaths, setExplorerClipboardPaths } from "~/lib/explorer-clipboard"
import { getClipboardFilePaths, getParentPath, normalizePath, setClipboardFilePaths } from "~/lib/workspace"
import { cn } from "~/lib/utils"

import { FileTreeItem, useExpandedPaths } from "./FileTreeItem"

import type { FileNode } from "./types"

interface Props {
  data: FileNode[]
  notesPath?: string
  activeFilePath?: string | null
  onOpen?: (path: string) => void
  onRename?: (path: string) => void
  onDelete?: (paths: string[]) => void
  onCreateFile?: (parentPath?: string) => void
  onCreateFolder?: (parentPath?: string) => void
  onReveal?: (path: string) => void
  onCopyPath?: (path: string) => void
  onDropTabFile?: (sourcePath: string, destinationDir: string) => void
  onPasteFiles?: (sourcePaths: string[], destinationDir: string) => Promise<void> | void
}

const flattenVisible = (nodes: FileNode[], expanded: Set<string>): FileNode[] => {
  const result: FileNode[] = []
  const walk = (items: FileNode[]) => {
    for (const node of items) {
      result.push(node)
      if (node.type === "folder" && expanded.has(node.path) && node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}

export const FileTree = ({
  data,
  notesPath,
  activeFilePath,
  onOpen,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onReveal,
  onCopyPath,
  onDropTabFile,
  onPasteFiles,
}: Props) => {
  const { expandedPaths, toggleExpand, ensureExpanded } = useExpandedPaths(data, activeFilePath)
  const activeDropDir = useSyncExternalStore(subscribeTabDrag, getActiveDropDir, () => null)
  const activeTabPath = useSyncExternalStore(subscribeTabDrag, getActiveTabDragPath, () => null)
  const rootDropActive = Boolean(notesPath && activeDropDir === notesPath.replace(/\\/g, "/"))

  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const anchorRef = useRef<string | null>(null)
  const pasteLockRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleNodes = useMemo(() => flattenVisible(data, expandedPaths), [data, expandedPaths])
  const visiblePaths = useMemo(
    () => visibleNodes.map((node) => normalizePath(node.path)),
    [visibleNodes]
  )
  const selectedSet = useMemo(() => new Set(selectedPaths.map(normalizePath)), [selectedPaths])
  const notesPathNormalized = notesPath ? normalizePath(notesPath) : undefined

  useEffect(() => {
    setSelectedPaths((previous) => {
      const next = previous
        .map(normalizePath)
        .filter((path) => visiblePaths.includes(path) || path === notesPathNormalized)
      if (next.length === previous.length && next.every((path, index) => path === previous[index])) {
        return previous
      }
      return next
    })
  }, [visiblePaths, notesPathNormalized])

  const handleCreateFile = (parentPath?: string) => {
    if (parentPath) {
      ensureExpanded(parentPath)
    }
    onCreateFile?.(parentPath)
  }

  const handleCreateFolder = (parentPath?: string) => {
    if (parentPath) {
      ensureExpanded(parentPath)
    }
    onCreateFolder?.(parentPath)
  }

  const copySelection = useCallback(async () => {
    const paths = selectedPaths.length > 0 ? selectedPaths : activeFilePath ? [activeFilePath] : []
    if (paths.length === 0) {
      return
    }
    setExplorerClipboardPaths(paths)
    try {
      await setClipboardFilePaths(paths)
      toast.success(paths.length === 1 ? "已复制文件" : `已复制 ${paths.length} 个项目`)
    } catch {
      // Memory clipboard still works for in-app paste.
      toast.success(paths.length === 1 ? "已复制（应用内）" : `已复制 ${paths.length} 个项目（应用内）`)
    }
  }, [selectedPaths, activeFilePath])

  const pasteInto = useCallback(
    async (destinationDir?: string) => {
      if (pasteLockRef.current) {
        return
      }
      pasteLockRef.current = true
      window.setTimeout(() => {
        pasteLockRef.current = false
      }, 250)

      const target = destinationDir || notesPath
      if (!target || !onPasteFiles) {
        return
      }
      try {
        let paths = await getClipboardFilePaths()
        if (paths.length === 0) {
          paths = getExplorerClipboardPaths()
        }
        if (paths.length === 0) {
          toast.message("剪贴板中没有可粘贴的文件")
          return
        }
        await onPasteFiles(paths, target)
      } catch (error) {
        toast.error("粘贴失败", {
          description: error instanceof Error ? error.message : "无法读取剪贴板文件",
        })
      }
    },
    [notesPath, onPasteFiles]
  )

  const selectWithModifiers = useCallback(
    (path: string, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      const normalized = normalizePath(path)

      if (event.shiftKey) {
        const anchor = anchorRef.current ?? normalized
        const start = visiblePaths.indexOf(anchor)
        const end = visiblePaths.indexOf(normalized)
        if (start >= 0 && end >= 0) {
          const [from, to] = start < end ? [start, end] : [end, start]
          setSelectedPaths(visiblePaths.slice(from, to + 1))
          if (!anchorRef.current) {
            anchorRef.current = normalized
          }
          return
        }
      }

      if (event.ctrlKey || event.metaKey) {
        setSelectedPaths((previous) => {
          const current = previous.map(normalizePath)
          if (current.includes(normalized)) {
            return current.filter((item) => item !== normalized)
          }
          return [...current, normalized]
        })
        anchorRef.current = normalized
        return
      }

      setSelectedPaths([normalized])
      anchorRef.current = normalized
    },
    [visiblePaths]
  )

  const handleItemClick = useCallback(
    (path: string, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      selectWithModifiers(path, event)
      // preventScroll: focusing the tall tree container must not jump SidebarContent to top.
      window.requestAnimationFrame(() => {
        containerRef.current?.focus({ preventScroll: true })
      })
    },
    [selectWithModifiers]
  )

  const handleItemDoubleClick = useCallback(
    (path: string, isFolder: boolean) => {
      const normalized = normalizePath(path)
      if (isFolder) {
        toggleExpand(path)
        return
      }
      setSelectedPaths([normalized])
      anchorRef.current = normalized
      onOpen?.(path)
    },
    [onOpen, toggleExpand]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return
      }

      const explorer = containerRef.current
      if (!explorer) {
        return
      }
      const inExplorer =
        active === explorer ||
        explorer.contains(active) ||
        active?.closest(`[${EXPLORER_ZONE_ATTR}="explorer"]`) != null ||
        active?.closest("[data-slot='sidebar']") != null

      if (!inExplorer) {
        return
      }

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === "c") {
        event.preventDefault()
        event.stopPropagation()
        void copySelection()
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === "v") {
        event.preventDefault()
        event.stopPropagation()
        void pasteInto(notesPath)
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === "a") {
        event.preventDefault()
        setSelectedPaths(visiblePaths)
        return
      }

      if (key === "delete" || key === "backspace") {
        if (selectedPaths.length === 0) {
          return
        }
        event.preventDefault()
        onDelete?.(selectedPaths)
        return
      }

      if (key === "f2") {
        if (selectedPaths.length !== 1) {
          return
        }
        event.preventDefault()
        onRename?.(selectedPaths[0])
        return
      }

      if (key === "enter" && selectedPaths.length === 1) {
        const node = visibleNodes.find((item) => normalizePath(item.path) === selectedPaths[0])
        if (!node) {
          return
        }
        event.preventDefault()
        handleItemDoubleClick(node.path, node.type === "folder")
      }
    }

    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [
    copySelection,
    pasteInto,
    notesPath,
    visiblePaths,
    visibleNodes,
    selectedPaths,
    onDelete,
    onRename,
    handleItemDoubleClick,
  ])

  const handleHtmlDrop = (event: DragEvent) => {
    event.preventDefault()
    const sourcePath = activeTabPath
    if (!sourcePath || !notesPath) {
      return
    }
    onDropTabFile?.(sourcePath, notesPath)
  }

  const pasteTargetDir =
    selectedPaths.length === 1
      ? visibleNodes.find((node) => normalizePath(node.path) === selectedPaths[0])?.type === "folder"
        ? selectedPaths[0]
        : getParentPath(selectedPaths[0]) || notesPath
      : notesPath

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full min-h-[160px] w-full">
        <div
          ref={containerRef}
          tabIndex={0}
          {...{ [DROP_DIR_ATTR]: notesPath ?? "" }}
          {...{ [EXPLORER_ZONE_ATTR]: "explorer" }}
          className={cn(
            "h-full px-1 py-1 outline-none focus-visible:ring-1 focus-visible:ring-primary/30",
            rootDropActive && "rounded-md bg-primary/10 ring-1 ring-primary/30"
          )}
          onDragOver={(event) => {
            if (!activeTabPath) {
              return
            }
            event.preventDefault()
            event.dataTransfer.dropEffect = "copy"
          }}
          onDrop={handleHtmlDrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPaths([])
              anchorRef.current = null
              containerRef.current?.focus({ preventScroll: true })
            }
          }}
        >
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-8 text-center">
              <div className="text-[12px] text-muted-foreground">暂无文件</div>
              <div className="text-[11px] text-muted-foreground/70">右键新建，或 Ctrl+C / Ctrl+V 复制粘贴</div>
            </div>
          ) : (
            data.map((item) => (
              <FileTreeItem
                key={item.id}
                node={item}
                selectedPaths={selectedSet}
                activeFilePath={activeFilePath}
                expandedPaths={expandedPaths}
                onToggleExpand={toggleExpand}
                onItemClick={handleItemClick}
                onItemDoubleClick={handleItemDoubleClick}
                onRename={onRename}
                onDelete={(path) => {
                  if (selectedSet.has(path) && selectedPaths.length > 1) {
                    onDelete?.(selectedPaths)
                  } else {
                    onDelete?.([path])
                  }
                }}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onReveal={onReveal}
                onCopyPath={onCopyPath}
                onDropTabFile={onDropTabFile}
                onPasteFiles={(destinationDir) => void pasteInto(destinationDir)}
                onCopySelection={() => void copySelection()}
              />
            ))
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleCreateFile()}>
          <FilePlus2 className="mr-2 size-4" />
          新建文件
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleCreateFolder()}>
          <FolderPlus className="mr-2 size-4" />
          新建文件夹
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => void copySelection()} disabled={selectedPaths.length === 0}>
          复制
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void pasteInto(pasteTargetDir)}>
          <ClipboardPaste className="mr-2 size-4" />
          粘贴
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
