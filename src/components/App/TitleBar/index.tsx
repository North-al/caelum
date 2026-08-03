import { useRef, useState, type DragEvent } from "react"
import {
  Eye,
  FileText,
  ListTree,
  PanelLeft,
  PenSquare,
  SplitSquareHorizontal,
  X,
} from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { WindowControls } from "~/layouts/components/WindowControls"
import { CAELUM_TAB_PATH_MIME } from "~/lib/dnd"
import { cn } from "~/lib/utils"
import { useWorkspaceStore } from "~/store/workspace"
import { useSidebar } from "~/components/ui/sidebar"

import type { ViewMode } from "~/store/workspace"

const fileNameFromPath = (value: string) => value.split(/[\\/]/).pop() ?? value

interface ViewModeButtonProps {
  active: boolean
  mode: ViewMode
  label: string
  onSelect: (mode: ViewMode) => void
  icon: React.ReactNode
}

const ViewModeButton = ({ active, mode, label, onSelect, icon }: ViewModeButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "rounded-md",
            active ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground"
          )}
          onClick={() => onSelect(mode)}
          aria-label={label}
          aria-pressed={active}
        />
      }
    >
      {icon}
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
)

export const TitleBar = () => {
  const {
    openFiles,
    selectedFilePath,
    selectFile,
    closeFileTab,
    closeOtherTabs,
    closeTabsToTheRight,
    closeAllTabs,
    reorderTabs,
    viewMode,
    setViewMode,
    outlineVisible,
    setOutlineVisible,
  } = useWorkspaceStore()
  const { toggleSidebar } = useSidebar()
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const openTabs = openFiles.length > 0 ? openFiles : selectedFilePath ? [selectedFilePath] : []

  const handleDragStart = (index: number, filePath: string) => (event: DragEvent) => {
    dragIndexRef.current = index
    event.dataTransfer.effectAllowed = "copyMove"
    event.dataTransfer.setData("text/plain", String(index))
    event.dataTransfer.setData(CAELUM_TAB_PATH_MIME, filePath)
  }

  const handleDragOver = (index: number) => (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault()
    const from = dragIndexRef.current
    dragIndexRef.current = null
    setDragOverIndex(null)
    if (from === null || from === index) {
      return
    }
    void reorderTabs(from, index)
  }

  return (
    <div className="flex h-11 shrink-0 items-stretch border-b border-border/50 bg-muted/30">
      <div className="flex items-center pl-1.5" data-tauri-drag-region>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={toggleSidebar}
          aria-label="切换侧边栏"
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto" data-tauri-drag-region>
        {openTabs.length === 0 ? (
          <div className="flex items-center px-4 text-sm text-muted-foreground" data-tauri-drag-region>
            未打开文件
          </div>
        ) : (
          openTabs.map((filePath, index) => {
            const active = selectedFilePath === filePath
            return (
              <ContextMenu key={filePath}>
                <ContextMenuTrigger
                  className={cn(
                    "group relative flex h-full min-w-0 cursor-pointer items-center gap-2 border-r border-border/40 px-3 text-[13px] transition-colors",
                    active
                      ? "bg-background text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]"
                      : "bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    dragOverIndex === index && "bg-primary/10"
                  )}
                  draggable
                  onDragStart={handleDragStart(index, filePath)}
                  onDragOver={handleDragOver(index)}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={handleDrop(index)}
                  onDragEnd={() => {
                    dragIndexRef.current = null
                    setDragOverIndex(null)
                  }}
                  onClick={() => void selectFile(filePath)}
                >
                  <FileText className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/70")} />
                  <span className="max-w-[160px] truncate font-medium">{fileNameFromPath(filePath)}</span>
                  <button
                    type="button"
                    aria-label="关闭标签"
                    className={cn(
                      "rounded-sm p-0.5 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground",
                      active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(event) => {
                      event.stopPropagation()
                      void closeFileTab(filePath)
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => void closeFileTab(filePath)}>关闭</ContextMenuItem>
                  <ContextMenuItem onClick={() => void closeOtherTabs(filePath)}>关闭其他</ContextMenuItem>
                  <ContextMenuItem onClick={() => void closeTabsToTheRight(filePath)}>关闭右侧</ContextMenuItem>
                  <ContextMenuItem onClick={() => void closeAllTabs()}>全部关闭</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => {
                      void navigator.clipboard.writeText(filePath)
                    }}
                  >
                    复制路径
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })
        )}
      </div>

      <div className="flex items-center gap-0.5 px-1">
        <div className="mr-0.5 flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
          <ViewModeButton
            mode="editor"
            label="仅编辑"
            active={viewMode === "editor"}
            onSelect={setViewMode}
            icon={<PenSquare className="size-3.5" />}
          />
          <ViewModeButton
            mode="split"
            label="分屏"
            active={viewMode === "split"}
            onSelect={setViewMode}
            icon={<SplitSquareHorizontal className="size-3.5" />}
          />
          <ViewModeButton
            mode="preview"
            label="仅预览"
            active={viewMode === "preview"}
            onSelect={setViewMode}
            icon={<Eye className="size-3.5" />}
          />
        </div>

        <div className="mx-1 h-4 w-px bg-border/50" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "rounded-md",
                  outlineVisible ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground"
                )}
                onClick={() => setOutlineVisible(!outlineVisible)}
                aria-label="大纲"
                aria-pressed={outlineVisible}
              />
            }
          >
            <ListTree className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom">大纲</TooltipContent>
        </Tooltip>
      </div>

      <WindowControls />
    </div>
  )
}
