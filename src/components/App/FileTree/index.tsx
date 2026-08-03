import { useSyncExternalStore, type DragEvent } from "react"
import { FilePlus2, FolderPlus } from "lucide-react"

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
  const activeDropDir = useSyncExternalStore(subscribeTabDrag, getActiveDropDir, () => null)
  const activeTabPath = useSyncExternalStore(subscribeTabDrag, getActiveTabDragPath, () => null)
  const rootDropActive = Boolean(notesPath && activeDropDir === notesPath.replace(/\\/g, "/"))

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

  // Keep HTML5 drop as a secondary path for environments that support it.
  const handleHtmlDrop = (event: DragEvent) => {
    event.preventDefault()
    const sourcePath = activeTabPath
    if (!sourcePath || !notesPath) {
      return
    }
    onDropTabFile?.(sourcePath, notesPath)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full min-h-[160px] w-full">
        <div
          {...{ [DROP_DIR_ATTR]: notesPath ?? "" }}
          {...{ [EXPLORER_ZONE_ATTR]: "explorer" }}
          className={cn(
            "h-full px-1 py-1",
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
