import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react"
import {
  ChevronRight,
  Copy,
  ExternalLink,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  PencilLine,
  Trash2,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import { DROP_DIR_ATTR, getActiveDropDir, subscribeTabDrag } from "~/lib/dnd"
import { getParentPath } from "~/lib/workspace"
import { cn } from "~/lib/utils"

import type { FileNode } from "./types"

interface Props {
  node: FileNode
  level?: number
  selectedPath?: string | null
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  onSelect?: (path: string) => void
  onRename?: (path: string) => void
  onDelete?: (path: string) => void
  onCreateFile?: (parentPath: string) => void
  onCreateFolder?: (parentPath: string) => void
  onReveal?: (path: string) => void
  onCopyPath?: (path: string) => void
  onDropTabFile?: (sourcePath: string, destinationDir: string) => void
}

export const FileTreeItem = ({
  node,
  level = 0,
  selectedPath,
  expandedPaths,
  onToggleExpand,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onReveal,
  onCopyPath,
  onDropTabFile,
}: Props) => {
  const isFolder = node.type === "folder"
  const isSelected = !isFolder && selectedPath === node.path
  const isExpanded = isFolder && expandedPaths.has(node.path)
  const paddingLeft = 12 + level * 12
  const dropDir = isFolder ? node.path : getParentPath(node.path)
  const activeDropDir = useSyncExternalStore(subscribeTabDrag, getActiveDropDir, () => null)
  const dropActive = Boolean(dropDir && activeDropDir === dropDir.replace(/\\/g, "/"))

  const rowClassName = cn(
    "group flex h-[30px] w-full items-center gap-1 px-1 pr-2 text-[13px] outline-none transition-colors",
    "hover:bg-sidebar-accent/70",
    isSelected && "bg-sidebar-accent text-sidebar-accent-foreground",
    dropActive && "bg-primary/15 ring-1 ring-inset ring-primary/40"
  )

  const stop = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

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

  const fileMenu = (
    <>
      <ContextMenuItem onClick={() => onSelect?.(node.path)}>打开</ContextMenuItem>
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
              className={rowClassName}
              style={{ paddingLeft }}
            >
              <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-0.5 text-left outline-none">
                <ChevronRight
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground/80 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
                {isExpanded ? (
                  <FolderOpen className="size-3.5 shrink-0 text-amber-500/90" />
                ) : (
                  <Folder className="size-3.5 shrink-0 text-amber-500/90" />
                )}
                <span className="truncate pl-0.5">{node.name}</span>
              </CollapsibleTrigger>
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
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onReveal={onReveal}
                onCopyPath={onCopyPath}
                onDropTabFile={onDropTabFile}
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
          className={cn(rowClassName, "w-full text-left")}
          style={{ paddingLeft: paddingLeft + 16 }}
          onClick={() => onSelect?.(node.path)}
          onDoubleClick={() => onRename?.(node.path)}
        >
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
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
