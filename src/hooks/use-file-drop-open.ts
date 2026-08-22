import { useEffect, useState } from "react"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { toast } from "sonner"

import { isImagePath } from "~/lib/assets"
import { EXPLORER_ZONE_ATTR, findDropDirFromPoint } from "~/lib/dnd"
import { isDropOpenablePath } from "~/lib/file-types"
import { useWorkspaceStore } from "~/store/workspace"

const SUPPORTED_DROP_HINT = "Markdown / 配置 / 源码等文本文件"

export type ExternalDropZone = "explorer" | "preview" | null

interface Options {
  enabled?: boolean
  onInsertImages?: (paths: string[]) => Promise<void> | void
  onImportNotesToExplorer?: (paths: string[], destinationDir: string) => Promise<void> | void
}

const toCssPoint = (position: { x: number; y: number }) => {
  const ratio = window.devicePixelRatio || 1
  return {
    x: position.x / ratio,
    y: position.y / ratio,
  }
}

const resolveZone = (position: { x: number; y: number } | undefined): ExternalDropZone => {
  if (!position) {
    return "preview"
  }
  const point = toCssPoint(position)
  const element = document.elementFromPoint(point.x, point.y)
  if (element?.closest(`[${EXPLORER_ZONE_ATTR}="explorer"]`)) {
    return "explorer"
  }
  return "preview"
}

/**
 * OS file drops:
 * - Explorer zone → copy supported notes into workspace
 * - Preview / editor zone → open notes as tabs or insert images
 */
export const useFileDropOpen = ({
  enabled = true,
  onInsertImages,
  onImportNotesToExplorer,
}: Options = {}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragKind, setDragKind] = useState<"note" | "image" | "mixed" | "unsupported" | null>(null)
  const [dropZone, setDropZone] = useState<ExternalDropZone>(null)
  const selectFile = useWorkspaceStore((state) => state.selectFile)
  const setViewMode = useWorkspaceStore((state) => state.setViewMode)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let unlisten: (() => void) | undefined
    let cancelled = false

    void getCurrentWebview()
      .onDragDropEvent(async (event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          const paths =
            event.payload.type === "enter"
              ? event.payload.paths.map((path) => path.replace(/\\/g, "/"))
              : null

          if (paths) {
            const hasNotes = paths.some(isDropOpenablePath)
            const hasImages = paths.some(isImagePath)
            const hasUnsupported = paths.some((path) => !isDropOpenablePath(path) && !isImagePath(path))
            if (hasNotes && hasImages) {
              setDragKind("mixed")
            } else if (hasImages) {
              setDragKind("image")
            } else if (hasNotes) {
              setDragKind("note")
            } else if (hasUnsupported) {
              setDragKind("unsupported")
            } else {
              setDragKind(null)
            }
            setIsDragging(hasNotes || hasImages || hasUnsupported)
          } else {
            setIsDragging(true)
          }

          setDropZone(resolveZone(event.payload.position))
          return
        }

        if (event.payload.type === "leave") {
          setIsDragging(false)
          setDragKind(null)
          setDropZone(null)
          return
        }

        if (event.payload.type !== "drop") {
          setIsDragging(false)
          setDragKind(null)
          setDropZone(null)
          return
        }

        const zone = resolveZone(event.payload.position)
        setIsDragging(false)
        setDragKind(null)
        setDropZone(null)

        const paths = (event.payload.paths ?? []).map((path) => path.replace(/\\/g, "/"))
        const notePaths = paths.filter(isDropOpenablePath)
        const imagePaths = paths.filter(isImagePath)
        const unsupportedPaths = paths.filter((path) => !isDropOpenablePath(path) && !isImagePath(path))
        const hasOpenNote = Boolean(useWorkspaceStore.getState().selectedFilePath)
        const notesPath = useWorkspaceStore.getState().config?.notesPath

        if (zone === "explorer" && notePaths.length > 0 && onImportNotesToExplorer && notesPath) {
          const point = toCssPoint(event.payload.position)
          const destinationDir = findDropDirFromPoint(point.x, point.y) || notesPath
          try {
            await onImportNotesToExplorer(notePaths, destinationDir)
            if (unsupportedPaths.length > 0) {
              toast.message("当前不支持该类型文件打开")
            }
          } catch (error) {
            toast.error("导入失败", {
              description: error instanceof Error ? error.message : "无法复制到资源管理器",
            })
          }
          return
        }

        if (imagePaths.length > 0 && hasOpenNote && onInsertImages && zone !== "explorer") {
          try {
            await onInsertImages(imagePaths)
            if (unsupportedPaths.length > 0) {
              toast.message("当前不支持该类型文件打开")
            }
          } catch (error) {
            toast.error("插入图片失败", {
              description: error instanceof Error ? error.message : "无法导入图片",
            })
          }
          return
        }

        if (notePaths.length === 0) {
          if (unsupportedPaths.length > 0) {
            toast.message("当前不支持该类型文件打开")
            return
          }
          if (imagePaths.length > 0) {
            toast.message(zone === "explorer" ? "图片请拖到编辑区插入" : "请先打开一篇笔记", {
              description:
                zone === "explorer"
                  ? `资源管理器支持导入 ${SUPPORTED_DROP_HINT}`
                  : "打开笔记后再拖入图片，会复制到 assets",
            })
            return
          }
          toast.message("当前不支持该类型文件打开")
          return
        }

        try {
          setViewMode("preview")
          for (const path of notePaths) {
            await selectFile(path)
          }
          await selectFile(notePaths[0])
          toast.success(notePaths.length === 1 ? "已打开预览" : `已打开 ${notePaths.length} 个标签`, {
            description: notePaths[0].split("/").pop(),
          })
          if (unsupportedPaths.length > 0) {
            toast.message("当前不支持该类型文件打开")
          }
        } catch (error) {
          toast.error("打开失败", {
            description: error instanceof Error ? error.message : "无法读取拖入的文件",
          })
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn()
          return
        }
        unlisten = fn
      })
      .catch(() => {
        // Non-Tauri environments ignore drag-drop wiring.
      })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [enabled, onImportNotesToExplorer, onInsertImages, selectFile, setViewMode])

  return { isDragging, dragKind, dropZone }
}
