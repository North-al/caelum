import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect, type PointerEvent, type ReactNode } from "react"
import {
  Eye,
  EyeOff,
  FileText,
  GripHorizontal,
  ListTodo,
  Palette,
  Pin,
  PinOff,
  Plus,
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"
import type { ScratchEditorMode } from "~/lib/scratch"
import { cn } from "~/lib/utils"

interface Props {
  children: ReactNode
  editorMode: ScratchEditorMode
  pinned: boolean
  lookOpen: boolean
  preview: boolean
  onPin: () => void
  onLook: () => void
  onPreview: () => void
  onAdd: () => void
  onClose: () => void
  onEditorModeChange: (mode: ScratchEditorMode) => void
  onWindowDragStart?: () => void
  onWindowDragEnd?: () => void
}

const RailIcon = ({
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
          className={cn("scratch-note-rail-btn", active && "is-active")}
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
  children,
  editorMode,
  pinned,
  lookOpen,
  preview,
  onPin,
  onLook,
  onPreview,
  onAdd,
  onClose,
  onEditorModeChange,
  onWindowDragStart,
  onWindowDragEnd,
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
    <div className="scratch-note-layout">
      <div className="scratch-note-stage">
        <div className="scratch-note-topbar">
          <div
            className="scratch-note-drag-strip"
            data-tauri-drag-region
            onPointerDown={startDrag}
            title="拖动窗口"
          >
            <GripHorizontal className="scratch-note-drag-grip" strokeWidth={2} />
          </div>
          <aside className="scratch-note-rail" aria-label="便签工具">
            <RailIcon tip={pinned ? "取消置顶" : "窗口置顶"} active={pinned} onClick={onPin}>
              {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
            </RailIcon>
            <RailIcon
              tip={editorMode === "todo" ? "待办清单" : "切换到待办"}
              active={editorMode === "todo"}
              onClick={() => onEditorModeChange("todo")}
            >
              <ListTodo className="size-3.5" />
            </RailIcon>
            <RailIcon
              tip={editorMode === "memo" ? "便签长文" : "切换到便签"}
              active={editorMode === "memo"}
              onClick={() => onEditorModeChange("memo")}
            >
              <FileText className="size-3.5" />
            </RailIcon>
            {editorMode === "todo" ? (
              <RailIcon tip="新增一条" onClick={onAdd}>
                <Plus className="size-3.5" />
              </RailIcon>
            ) : null}
            {editorMode === "memo" ? (
              <RailIcon tip={preview ? "编辑模式" : "阅读模式"} active={preview} onClick={onPreview}>
                {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </RailIcon>
            ) : null}
            <span className="scratch-note-rail-divider" aria-hidden />
            <RailIcon tip="主题外观" active={lookOpen} onClick={onLook}>
              <Palette className="size-3.5" />
            </RailIcon>
            <button type="button" className="scratch-note-rail-close" aria-label="关闭" onClick={onClose}>
              ×
            </button>
          </aside>
        </div>
        {children}
      </div>
    </div>
  )
}
