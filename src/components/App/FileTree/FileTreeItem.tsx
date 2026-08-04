import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import {
  Braces,
  ChevronRight,
  ClipboardPaste,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  ImageIcon,
  PencilLine,
  Trash2,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
} from "~/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import { DROP_DIR_ATTR, getActiveDropDir, subscribeTabDrag } from "~/lib/dnd"
import { getFileExtension, isBinaryImagePath, isImagePath } from "~/lib/file-types"
import { getParentPath, normalizePath } from "~/lib/workspace"
import { cn } from "~/lib/utils"

import type { FileNode } from "./types"

interface ClickModifiers {
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

interface Props {
  node: FileNode
  level?: number
  selectedPaths: Set<string>
  activeFilePath?: string | null
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  onItemClick?: (path: string, modifiers: ClickModifiers) => void
  onItemDoubleClick?: (path: string, isFolder: boolean) => void
  onRename?: (path: string) => void
  onDelete?: (path: string) => void
  onCreateFile?: (parentPath: string) => void
  onCreateFolder?: (parentPath: string) => void
  onReveal?: (path: string) => void
  onCopyPath?: (path: string) => void
  onDropTabFile?: (sourcePath: string, destinationDir: string) => void
  onPasteFiles?: (destinationDir: string) => void
  onCopySelection?: () => void
}

const FileTypeIcon = ({ path }: { path: string }) => {
  const extension = getFileExtension(path)
  if (isImagePath(path)) {
    if (isBinaryImagePath(path) || extension === "svg") {
      return (
        <img
          src={convertFileSrc(normalizePath(path))}
          alt=""
          className="size-3.5 shrink-0 rounded-[3px] object-cover ring-1 ring-border/50"
          loading="lazy"
        />
      )
    }
    return <ImageIcon className="size-3.5 shrink-0 text-emerald-500" />
  }
  if (extension === "json") {
    return <Braces className="size-3.5 shrink-0 text-amber-500" />
  }
  if (extension === "xml" || extension === "svg") {
    return <Code2 className="size-3.5 shrink-0 text-sky-500" />
  }
  if (extension === "ini") {
    return <FileCode2 className="size-3.5 shrink-0 text-violet-500" />
  }
  return <FileText className="size-3.5 shrink-0 text-muted-foreground" />
}

export const FileTreeItem = ({
  node,
  level = 0,
  selectedPaths,
  activeFilePath,
  expandedPaths,
  onToggleExpand,
  onItemClick,
  onItemDoubleClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onReveal,
  onCopyPath,
  onDropTabFile,
  onPasteFiles,
  onCopySelection,
}: Props) => {
  const isFolder = node.type === "folder"
  const nodePath = normalizePath(node.path)
  const isSelected = selectedPaths.has(nodePath)
  const isActiveFile = !isFolder && activeFilePath != null && normalizePath(activeFilePath) === nodePath
  const isExpanded = isFolder && (expandedPaths.has(node.path) || expandedPaths.has(nodePath))
  const paddingLeft = 12 + level * 12
  const dropDir = isFolder ? node.path : getParentPath(node.path)
  const activeDropDir = useSyncExternalStore(subscribeTabDrag, getActiveDropDir, () => null)
  const dropActive = Boolean(dropDir && activeDropDir === normalizePath(dropDir))

  const rowClassName = cn(
    "group flex h-[30px] w-full items-center gap-1 rounded-md px-1 pr-2 text-[13px] outline-none transition-colors",
    isSelected
      ? "bg-primary/25 text-foreground ring-1 ring-inset ring-primary/40 hover:bg-primary/30"
      : "hover:bg-sidebar-accent/70",
    isActiveFile && !isSelected && "bg-sidebar-accent/80 text-sidebar-accent-foreground",
    dropActive && !isSelected && "bg-primary/15 ring-1 ring-inset ring-primary/35"
  )

  const stop = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const clickModifiers = (event: MouseEvent): ClickModifiers => ({
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  })

  const folderMenu = (
    <>
      <ContextMenuItem onClick={() => onCreateFile?.(node.path)}>
        <FilePlus2 className="mr-2 size-4" />
        新建文件
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCreateFolder?.(node.path)}>
        <FolderPlus className="mr-2 size-4" />
        新建文件夹
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onPasteFiles?.(node.path)}>
        <ClipboardPaste className="mr-2 size-4" />
        粘贴
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onCopySelection?.()}>复制</ContextMenuItem>
      <ContextMenuItem onClick={() => onRename?.(node.path)}>
        <PencilLine className="mr-2 size-4" />
        重命名
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCopyPath?.(node.path)}>
        <Copy className="mr-2 size-4" />
        复制路径
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onReveal?.(node.path)}>
        <ExternalLink className="mr-2 size-4" />
        在资源管理器中显示
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={() => onDelete?.(node.path)}>
        <Trash2 className="mr-2 size-4" />
        删除
      </ContextMenuItem>
    </>
  )

  const fileMenu = (
    <>
      <ContextMenuItem onClick={() => onItemDoubleClick?.(node.path, false)}>打开</ContextMenuItem>
      <ContextMenuItem onClick={() => onCopySelection?.()}>复制</ContextMenuItem>
      <ContextMenuItem onClick={() => onPasteFiles?.(getParentPath(node.path))}>
        <ClipboardPaste className="mr-2 size-4" />
        粘贴到此处
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onRename?.(node.path)}>
        <PencilLine className="mr-2 size-4" />
        重命名
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCopyPath?.(node.path)}>
        <Copy className="mr-2 size-4" />
        复制路径
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onReveal?.(node.path)}>
        <ExternalLink className="mr-2 size-4" />
        在资源管理器中显示
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={() => onDelete?.(node.path)}>
        <Trash2 className="mr-2 size-4" />
        删除
      </ContextMenuItem>
    </>
  )

  if (isFolder) {
    return (
      <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(node.path)}>
        <ContextMenu>
          <ContextMenuTrigger className="block w-full">
            <div
              {...{ [DROP_DIR_ATTR]: node.path }}
              data-selected={isSelected ? "true" : undefined}
              className={rowClassName}
              style={{ paddingLeft }}
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return
                }
                event.stopPropagation()
                onItemClick?.(nodePath, clickModifiers(event))
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
              onDoubleClick={(event) => {
                stop(event)
                onItemDoubleClick?.(node.path, true)
              }}
            >
              <button
                type="button"
                className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/70"
                onClick={(event) => {
                  stop(event)
                  onToggleExpand(node.path)
                }}
                aria-label={isExpanded ? "折叠" : "展开"}
              >
                <ChevronRight className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")} />
              </button>
              {isExpanded ? (
                <FolderOpen className="size-3.5 shrink-0 text-amber-500/90" />
              ) : (
                <Folder className="size-3.5 shrink-0 text-amber-500/90" />
              )}
              <span className="min-w-0 flex-1 truncate pl-0.5 text-left">{node.name}</span>
              <div className="ml-auto hidden shrink-0 items-center group-hover:flex">
                <button
                  type="button"
                  title="新建文件"
                  className="rounded p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  onClick={(event) => {
                    stop(event)
                    onCreateFile?.(node.path)
                  }}
                >
                  <FilePlus2 className="size-3.5" />
                </button>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>{folderMenu}</ContextMenuContent>
        </ContextMenu>

        <CollapsibleContent className="overflow-hidden">
          {(node.children ?? []).length > 0 ? (
            node.children?.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                selectedPaths={selectedPaths}
                activeFilePath={activeFilePath}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onItemClick={onItemClick}
                onItemDoubleClick={onItemDoubleClick}
                onRename={onRename}
                onDelete={onDelete}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onReveal={onReveal}
                onCopyPath={onCopyPath}
                onDropTabFile={onDropTabFile}
                onPasteFiles={onPasteFiles}
                onCopySelection={onCopySelection}
              />
            ))
          ) : (
            <div
              className="py-0.5 text-[11px] text-muted-foreground/60"
              style={{ paddingLeft: paddingLeft + 28 }}
            >
              空文件夹
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block w-full">
        <button
          type="button"
          {...{ [DROP_DIR_ATTR]: dropDir }}
          data-selected={isSelected ? "true" : undefined}
          className={cn(rowClassName, "w-full text-left")}
          style={{ paddingLeft: paddingLeft + 16 }}
          onMouseDown={(event) => {
            if (event.button !== 0) {
              return
            }
            event.stopPropagation()
            onItemClick?.(nodePath, clickModifiers(event))
          }}
          onClick={(event) => {
            event.stopPropagation()
          }}
          onDoubleClick={(event) => {
            stop(event)
            onItemDoubleClick?.(node.path, false)
          }}
        >
          <FileTypeIcon path={node.path} />
          <span className="min-w-0 flex-1 truncate pl-0.5">{node.name}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>{fileMenu}</ContextMenuContent>
    </ContextMenu>
  )
}

export const getInitialExpandedPaths = (nodes: FileNode[], selectedPath?: string | null): Set<string> => {
  const expanded = new Set<string>()

  for (const item of nodes) {
    if (item.type === "folder") {
      expanded.add(item.path)
    }
  }

  if (selectedPath) {
    const normalized = selectedPath.replace(/\\/g, "/")
    const markAncestors = (items: FileNode[]): boolean => {
      for (const item of items) {
        if (item.type === "folder" && item.children) {
          const hit =
            item.children.some((child) => child.path.replace(/\\/g, "/") === normalized) ||
            markAncestors(item.children)
          if (hit) {
            expanded.add(item.path)
            return true
          }
        }
      }
      return false
    }
    markAncestors(nodes)
  }

  return expanded
}

export const useExpandedPaths = (nodes: FileNode[], selectedPath?: string | null) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => getInitialExpandedPaths(nodes, selectedPath))
  const [initialized, setInitialized] = useState(nodes.length > 0)

  useEffect(() => {
    if (!initialized && nodes.length > 0) {
      setExpandedPaths(getInitialExpandedPaths(nodes, selectedPath))
      setInitialized(true)
      return
    }

    if (!selectedPath) {
      return
    }

    setExpandedPaths((previous) => {
      const next = new Set(previous)
      const normalized = selectedPath.replace(/\\/g, "/")
      const markAncestors = (items: FileNode[]): boolean => {
        for (const item of items) {
          if (item.type === "folder" && item.children) {
            const hit =
              item.children.some((child) => child.path.replace(/\\/g, "/") === normalized) ||
              markAncestors(item.children)
            if (hit) {
              next.add(item.path)
              return true
            }
          }
        }
        return false
      }
      markAncestors(nodes)
      return next
    })
  }, [initialized, nodes, selectedPath])

  const toggleExpand = (path: string) => {
    setExpandedPaths((previous) => {
      const next = new Set(previous)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const ensureExpanded = (path: string) => {
    setExpandedPaths((previous) => {
      if (previous.has(path)) {
        return previous
      }
      const next = new Set(previous)
      next.add(path)
      return next
    })
  }

  return { expandedPaths, toggleExpand, ensureExpanded }
}
