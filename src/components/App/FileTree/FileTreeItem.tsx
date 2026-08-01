import type { MouseEvent } from "react"
import { FileText, FolderOpen, PencilLine, Trash2 } from "lucide-react"

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
import { cn } from "~/lib/utils"

import type { FileNode } from "./types"

interface Props {
  node: FileNode
  level?: number
  selectedPath?: string | null
  onSelect?: (path: string) => void
  onRename?: (path: string) => void
  onDelete?: (path: string) => void
}

const getFileTag = (name: string) => {
  if (name.toLowerCase().endsWith(".txt")) {
    return "TXT"
  }

  if (name.toLowerCase().endsWith(".md")) {
    return "MD"
  }

  return "FILE"
}

export const FileTreeItem = ({
  node,
  level = 0,
  selectedPath,
  onSelect,
  onRename,
  onDelete,
}: Props) => {
  const isFolder = node.type === "folder"
  const isSelected = selectedPath === node.path
  const itemClassName = cn(
    "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent/80",
    isSelected && "bg-primary/10 text-foreground"
  )

  const handleRename = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onRename?.(node.path)
  }

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDelete?.(node.path)
  }

  const content = (
    <div className={itemClassName} style={{ paddingLeft: level * 16 + 8 }}>
      {isFolder ? (
        <FolderOpen className="size-4 text-primary" />
      ) : (
        <FileText className="size-4 text-muted-foreground" />
      )}
      <span className="truncate">{node.name}</span>
      {!isFolder && (
        <span className="ml-auto rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-muted-foreground">
          {getFileTag(node.name)}
        </span>
      )}
      {!isFolder && (
        <div className="ml-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" className="rounded p-1 hover:bg-background" onClick={handleRename}>
            <PencilLine className="size-3" />
          </button>
          <button type="button" className="rounded p-1 hover:bg-background" onClick={handleDelete}>
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  )

  const menu = (
    <ContextMenu>
      <ContextMenuTrigger className="block w-full">
        {isFolder ? (
          <Collapsible>
            <CollapsibleTrigger
              className={itemClassName}
              style={{ paddingLeft: level * 16 + 8 }}
              onClick={() => onSelect?.(node.path)}
            >
              <FolderOpen className="size-4 text-primary" />
              <span className="truncate">{node.name}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
              {node.children?.map((child) => (
                <FileTreeItem
                  key={child.id}
                  node={child}
                  level={level + 1}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <button type="button" className="block w-full text-left" onClick={() => onSelect?.(node.path)}>
            {content}
          </button>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSelect?.(node.path)}>打开</ContextMenuItem>
        <ContextMenuItem onClick={() => onRename?.(node.path)}>重命名</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => onDelete?.(node.path)}>
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )

  if (isFolder) {
    return menu
  }

  return menu
}
