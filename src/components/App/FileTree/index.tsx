import { ScrollArea } from "~/components/ui/scroll-area"

import { FileTreeItem } from "./FileTreeItem"

import type { FileNode } from "./types"

interface Props {
  data: FileNode[]
  selectedPath?: string | null
  onSelect?: (path: string) => void
  onRename?: (path: string) => void
  onDelete?: (path: string) => void
}

export const FileTree = ({ data, selectedPath, onSelect, onRename, onDelete }: Props) => {
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {data.map((item) => (
          <FileTreeItem
            key={item.id}
            node={item}
            selectedPath={selectedPath}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
