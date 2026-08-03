import { useState, type DragEvent } from "react"
import { FilePlus2, FolderPlus } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import { CAELUM_TAB_PATH_MIME } from "~/lib/dnd"
import { cn } from "~/lib/utils"

import { FileTreeItem, useExpandedPaths } from "./FileTreeItem"

import type { FileNode } from "./types"

interface Props {
  data: FileNode[]
  notesPath?: string
  selectedPath?: string | null
  onSelect?: (path: string) => void
  onRename?: (path: string) => void
  onDelete?: (path: string) => void
  onCreateFile?: (parentPath?: string) => void
  onCreateFolder?: (parentPath?: string) => void
  onReveal?: (path: string) => void
  onCopyPath?: (path: string) => void
  onDropTabFile?: (sourcePath: string, destinationDir: string) => void
}

const readTabPath = (event: DragEvent) => {
  const fromMime = event.dataTransfer.getData(CAELUM_TAB_PATH_MIME)
  if (fromMime) {
    return fromMime
  }
  return ""
}

export const FileTree = ({
  data,
  notesPath,
  selectedPath,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  onReveal,
  onCopyPath,
  onDropTabFile,
}: Props) => {
  const { expandedPaths, toggleExpand, ensureExpanded } = useExpandedPaths(data, selectedPath)
  const [rootDropActive, setRootDropActive] = useState(false)

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

  const handleRootDragOver = (event: DragEvent) => {
    if (![...event.dataTransfer.types].includes(CAELUM_TAB_PATH_MIME)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    setRootDropActive(true)
  }

  const handleRootDrop = (event: DragEvent) => {
    event.preventDefault()
    setRootDropActive(false)
    const sourcePath = readTabPath(event)
    if (!sourcePath || !notesPath) {
      return
    }
    onDropTabFile?.(sourcePath, notesPath)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full min-h-[160px] w-full">
        <div
          className={cn("h-full py-0.5", rootDropActive && "rounded-md bg-primary/10 ring-1 ring-primary/30")}
          onDragOver={handleRootDragOver}
          onDragLeave={() => setRootDropActive(false)}
          onDrop={handleRootDrop}
        >
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-8 text-center">
              <div className="text-[12px] text-muted-foreground">暂无文件</div>
              <div className="text-[11px] text-muted-foreground/70">右键空白处新建，或将标签拖入此处复制</div>
            </div>
          ) : (
            data.map((item) => (
              <FileTreeItem
                key={item.id}
                node={item}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleExpand={toggleExpand}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onReveal={onReveal}
                onCopyPath={onCopyPath}
                onDropTabFile={onDropTabFile}
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
        <ContextMenuItem disabled className="text-xs text-muted-foreground">
          也可在文件夹上右键新建
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
