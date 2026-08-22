import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect, type PointerEvent, type ReactNode } from "react"
import {
  Archive,
  ClipboardPaste,
  Eye,
  EyeOff,
  FileInput,
  MoreHorizontal,
  Palette,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

interface Props {
  pinned: boolean
  lookOpen: boolean
  preview: boolean
  onPin: () => void
  onLook: () => void
  onPreview: () => void
  onAdd: () => void
  onClose: () => void
  onWindowDragStart?: () => void
  onWindowDragEnd?: () => void
  onArchive: () => void
  onPaste: () => void
  onPromote: () => void
  onDelete: () => void
}

const TipIcon = ({
  tip,
  active,
  onClick,
  children,
}: {
  tip: string
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <button
          type="button"
          className={cn("scratch-note-icon", active && "is-active")}
          aria-label={tip}
          onClick={onClick}
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent side="bottom">{tip}</TooltipContent>
  </Tooltip>
)

export const ScratchNoteChrome = ({
  pinned,
  lookOpen,
  preview,
  onPin,
  onLook,
  onPreview,
  onAdd,
  onClose,
  onWindowDragStart,
  onWindowDragEnd,
  onArchive,
  onPaste,
  onPromote,
  onDelete,
}: Props) => {
  useEffect(() => {
    const endDrag = () => onWindowDragEnd?.()
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
    window.addEventListener("blur", endDrag)
    return () => {
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
      window.removeEventListener("blur", endDrag)
    }
  }, [onWindowDragEnd])

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }
    onWindowDragStart?.()
    void getCurrentWindow().startDragging()
  }

  return (
    <header className="scratch-note-chrome">
      <div
        className="scratch-note-drag-strip"
        data-tauri-drag-region
        onPointerDown={startDrag}
        title="拖动窗口"
      >
        <span className="scratch-note-drag-pill" />
      </div>

      <div className="scratch-note-chrome-row">
        <button
          type="button"
          className={cn("scratch-note-pin", pinned && "is-active")}
          aria-label={pinned ? "取消置顶" : "窗口置顶"}
          onClick={onPin}
        >
          {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
        </button>

        <div className="scratch-note-chrome-spacer" data-tauri-drag-region onPointerDown={startDrag} />

        <div className="scratch-note-actions">
          <TipIcon tip="主题外观" active={lookOpen} onClick={onLook}>
            <Palette className="size-3.5" />
          </TipIcon>
          <button type="button" className="scratch-note-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <div className="scratch-note-toolbar">
        <TipIcon tip={preview ? "编辑模式" : "阅读模式"} active={preview} onClick={onPreview}>
          {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </TipIcon>
        <TipIcon tip="新增一条" onClick={onAdd}>
          <Plus className="size-3.5" />
        </TipIcon>
        <TipIcon tip="归档" onClick={onArchive}>
          <Archive className="size-3.5" />
        </TipIcon>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" className="scratch-note-icon" aria-label="更多">
                <MoreHorizontal className="size-3.5" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[11.5rem]">
            <DropdownMenuItem onClick={onPaste}>
              <ClipboardPaste className="size-4" />
              粘贴剪贴板
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPromote}>
              <FileInput className="size-4" />
              写入正式笔记
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="size-4" />
              删除这张便签
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
