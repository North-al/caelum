import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  Download,
  Eye,
  ExternalLink,
  FileText,
  ListTree,
  PanelLeft,
  PenSquare,
  SplitSquareHorizontal,
  X,
} from "lucide-react"
import { revealItemInDir } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { WindowControls } from "~/layouts/components/WindowControls"
import {
  beginTabDrag,
  endTabDrag,
  findDropDirFromPoint,
  setActiveDropDir,
} from "~/lib/dnd"
import { exportNote, type ExportFormat } from "~/lib/export"
import { getParentPath } from "~/lib/workspace"
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
            "rounded-lg",
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

interface DragSession {
  index: number
  path: string
  startX: number
  startY: number
  active: boolean
  pointerId: number
}

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
    copyFileToDirectory,
    viewMode,
    setViewMode,
    outlineVisible,
    setOutlineVisible,
  } = useWorkspaceStore()
  const { toggleSidebar } = useSidebar()
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(null)
  const sessionRef = useRef<DragSession | null>(null)
  const suppressClickRef = useRef(false)

  const openTabs = openFiles.length > 0 ? openFiles : selectedFilePath ? [selectedFilePath] : []
  const canExport = Boolean(selectedFilePath)

  useEffect(() => {
    return () => {
      endTabDrag()
    }
  }, [])

  const handleExport = async (format: ExportFormat, filePath?: string) => {
    try {
      if (filePath) {
        await selectFile(filePath)
      }
      const state = useWorkspaceStore.getState()
      const path = state.selectedFilePath
      const config = state.config
      if (!path || !config) {
        toast.error("请先打开一篇笔记")
        return
      }
      await exportNote({
        format,
        sourcePath: path,
        content: state.currentContent,
        workspaceRoot: getParentPath(config.notesPath),
        codeHighlight: config.settings.codeHighlight,
      })
    } catch (error) {
      toast.error("导出失败", {
        description: error instanceof Error ? error.message : "无法导出文件",
      })
    }
  }

  const finishPointerDrag = async (clientX: number, clientY: number) => {
    const session = sessionRef.current
    sessionRef.current = null
    setGhost(null)
    setDragOverIndex(null)

    if (!session?.active) {
      endTabDrag()
      return
    }

    suppressClickRef.current = true

    const dropDir = findDropDirFromPoint(clientX, clientY)
    endTabDrag()
    setActiveDropDir(null)

    if (dropDir) {
      try {
        const copied = await copyFileToDirectory(session.path, dropDir)
        if (copied) {
          toast.success("已复制到资源管理器", {
            description: copied.split(/[\\/]/).pop(),
          })
        }
      } catch (error) {
        toast.error("复制失败", {
          description: error instanceof Error ? error.message : "无法复制文件",
        })
      }
      return
    }

    const tabTarget = document.elementFromPoint(clientX, clientY)?.closest("[data-caelum-tab-index]") as HTMLElement | null
    const toIndex = tabTarget ? Number(tabTarget.dataset.caelumTabIndex) : NaN
    if (Number.isFinite(toIndex) && toIndex !== session.index) {
      void reorderTabs(session.index, toIndex)
    }
  }

  const handlePointerDown = (index: number, filePath: string) => (event: ReactPointerEvent) => {
    if (event.button !== 0) {
      return
    }
    sessionRef.current = {
      index,
      path: filePath,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      pointerId: event.pointerId,
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY)
    if (!session.active && distance > 6) {
      session.active = true
      beginTabDrag(session.path)
      setGhost({
        x: event.clientX,
        y: event.clientY,
        label: fileNameFromPath(session.path),
      })
    }

    if (!session.active) {
      return
    }

    setGhost({
      x: event.clientX,
      y: event.clientY,
      label: fileNameFromPath(session.path),
    })

    const dropDir = findDropDirFromPoint(event.clientX, event.clientY)
    setActiveDropDir(dropDir)

    const tabTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-caelum-tab-index]") as HTMLElement | null
    const overIndex = tabTarget ? Number(tabTarget.dataset.caelumTabIndex) : NaN
    setDragOverIndex(Number.isFinite(overIndex) ? overIndex : null)
  }

  const handlePointerUp = (event: ReactPointerEvent) => {
    const session = sessionRef.current
    if (!session || session.pointerId !== event.pointerId) {
      return
    }
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    void finishPointerDrag(event.clientX, event.clientY)
  }

  const handlePointerCancel = (event: ReactPointerEvent) => {
    if (sessionRef.current?.pointerId !== event.pointerId) {
      return
    }
    sessionRef.current = null
    setGhost(null)
    setDragOverIndex(null)
    endTabDrag()
    setActiveDropDir(null)
  }

  return (
    <>
      <div className="flex h-14 shrink-0 items-stretch border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center pl-2" data-tauri-drag-region>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-muted-foreground"
            onClick={toggleSidebar}
            aria-label="切换侧边栏"
          >
            <PanelLeft className="size-4" />
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto px-1 py-2">
          {openTabs.length === 0 ? (
            <div className="flex flex-1 items-center px-3 text-sm text-muted-foreground" data-tauri-drag-region>
              未打开文件
            </div>
          ) : (
            openTabs.map((filePath, index) => {
              const active = selectedFilePath === filePath
              return (
                <ContextMenu key={filePath}>
                  <ContextMenuTrigger
                    render={
                      <div
                        data-caelum-tab-index={index}
                        className={cn(
                          "group relative mr-1 flex h-full min-w-0 cursor-grab items-center gap-2 rounded-xl border px-3 text-[13px] transition-all active:cursor-grabbing",
                          active
                            ? "border-primary/25 bg-primary/10 text-foreground shadow-sm"
                            : "border-transparent bg-transparent text-muted-foreground hover:border-border/50 hover:bg-background/80 hover:text-foreground",
                          dragOverIndex === index && "border-primary/40 bg-primary/10"
                        )}
                        onPointerDown={handlePointerDown(index, filePath)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onMouseDown={(event) => {
                          if (event.button === 1) {
                            event.preventDefault()
                          }
                        }}
                        onAuxClick={(event) => {
                          if (event.button === 1) {
                            event.preventDefault()
                            event.stopPropagation()
                            void closeFileTab(filePath)
                          }
                        }}
                        onClick={() => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false
                            return
                          }
                          void selectFile(filePath)
                        }}
                      />
                    }
                  >
                    <FileText className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/70")} />
                    <span className="max-w-[160px] truncate font-medium">{fileNameFromPath(filePath)}</span>
                    <button
                      type="button"
                      aria-label="关闭标签"
                      className={cn(
                        "rounded-md p-0.5 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(event) => {
                        event.stopPropagation()
                        void closeFileTab(filePath)
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
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
                    <ContextMenuItem
                      onClick={() => {
                        void revealItemInDir(filePath).catch(() => {
                          toast.error("无法在资源管理器中打开")
                        })
                      }}
                    >
                      <ExternalLink className="mr-2 size-4" />
                      在资源管理器中显示
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => void handleExport("md", filePath)}>
                      导出 Markdown（解析后）…
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void handleExport("source", filePath)}>
                      导出源码 (.md)…
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void handleExport("txt", filePath)}>
                      导出 TXT…
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => void handleExport("pdf", filePath)}>
                      导出 PDF…
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })
          )}
          <div className="min-w-4 flex-1" data-tauri-drag-region />
        </div>

        <div className="flex items-center gap-0.5 px-1.5">
          <div className="mr-0.5 flex items-center gap-0.5 rounded-xl border border-border/40 bg-muted/40 p-0.5">
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
                    "rounded-lg",
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

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn("rounded-lg", canExport ? "text-muted-foreground" : "text-muted-foreground/40")}
                  disabled={!canExport}
                  aria-label="导出"
                />
              }
            >
              <Download className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem onClick={() => void handleExport("md")}>
                <FileText className="size-4" />
                导出 Markdown（解析后）
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("source")}>
                <FileText className="size-4" />
                导出源码 (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("txt")}>
                <FileText className="size-4" />
                导出纯文本 (.txt)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleExport("pdf")}>
                <Download className="size-4" />
                导出 PDF…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <WindowControls />
      </div>

      {ghost ? (
        <div
          className="pointer-events-none fixed z-[100] flex items-center gap-2 rounded-xl border border-border/60 bg-background/95 px-3 py-1.5 text-[13px] font-medium shadow-xl ring-1 ring-primary/20 backdrop-blur-sm"
          style={{ left: ghost.x + 12, top: ghost.y + 12 }}
        >
          <FileText className="size-3.5 text-primary" />
          {ghost.label}
        </div>
      ) : null}
    </>
  )
}
