import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent } from "react"
import {
  ClipboardPaste,
  FilePlus2,
  FolderPlus,
  FoldVertical,
  RefreshCw,
  UnfoldVertical,
} from "lucide-react"
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
  onCopyWikiLink?: (path: string) => void
  onDropTabFile?: (sourcePath: string, destinationDir: string) => void
  onPasteFiles?: (sourcePaths: string[], destinationDir: string) => Promise<void> | void
  onRefresh?: () => void
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
  onCopyWikiLink,
  onDropTabFile,
  onPasteFiles,
  onRefresh,
}: Props) => {
  const { expandedPaths, toggleExpand, ensureExpanded, expandAll, collapseAll } = useExpandedPaths(
    data,
    activeFilePath
  )
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
    } catch (error) {
      // Memory clipboard still works for in-app paste.
      toast.success(paths.length === 1 ? "已复制（应用内）" : `已复制 ${paths.length} 个项目（应用内）`, {
        description: error instanceof Error ? error.message : "系统剪贴板不可用",
      })
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
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
              <div className="text-[12px] text-muted-foreground">右键新建文档，或拖拽本地文件导入</div>
              <button
                type="button"
                className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                onClick={() => onCreateFile?.(notesPath)}
              >
                新建笔记
              </button>
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
                onCopyWikiLink={onCopyWikiLink}
                onDropTabFile={onDropTabFile}
                onPasteFiles={(destinationDir) => void pasteInto(destinationDir)}
                onCopySelection={() => void copySelection()}
              />
            ))
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44 rounded-xl p-1.5 shadow-lg duration-200">
        <ContextMenuItem className="rounded-lg" onClick={() => handleCreateFile()}>
          <FilePlus2 className="mr-2 size-4 text-primary" />
          新建文件
        </ContextMenuItem>
        <ContextMenuItem className="rounded-lg" onClick={() => handleCreateFolder()}>
          <FolderPlus className="mr-2 size-4 text-primary" />
          新建文件夹
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="rounded-lg"
          onClick={() => void copySelection()}
          disabled={selectedPaths.length === 0}
        >
          复制
        </ContextMenuItem>
        <ContextMenuItem className="rounded-lg" onClick={() => void pasteInto(pasteTargetDir)}>
          <ClipboardPaste className="mr-2 size-4" />
          粘贴
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="rounded-lg" onClick={() => expandAll()}>
          <UnfoldVertical className="mr-2 size-4" />
          全部展开
        </ContextMenuItem>
        <ContextMenuItem className="rounded-lg" onClick={() => collapseAll()}>
          <FoldVertical className="mr-2 size-4" />
          全部折叠
        </ContextMenuItem>
        <ContextMenuItem className="rounded-lg" onClick={() => onRefresh?.()}>
          <RefreshCw className="mr-2 size-4" />
          刷新资源目录
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
