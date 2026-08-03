import { useEffect, useState } from "react"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { toast } from "sonner"

import { isImagePath } from "~/lib/assets"
import { EXPLORER_ZONE_ATTR, findDropDirFromPoint } from "~/lib/dnd"
import { isMarkdownFile, isTextFile } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

const isOpenableNote = (path: string) => isMarkdownFile(path) || isTextFile(path)

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
 * - Explorer zone → copy notes into workspace
 * - Preview / editor zone → open notes or insert images
 */
export const useFileDropOpen = ({
  enabled = true,
  onInsertImages,
  onImportNotesToExplorer,
}: Options = {}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragKind, setDragKind] = useState<"note" | "image" | "mixed" | null>(null)
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
            const hasNotes = paths.some(isOpenableNote)
            const hasImages = paths.some(isImagePath)
            if (hasNotes && hasImages) {
              setDragKind("mixed")
            } else if (hasImages) {
              setDragKind("image")
            } else if (hasNotes) {
              setDragKind("note")
            } else {
              setDragKind(null)
            }
            setIsDragging(hasNotes || hasImages)
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
        const notePaths = paths.filter(isOpenableNote)
        const imagePaths = paths.filter(isImagePath)
        const hasOpenNote = Boolean(useWorkspaceStore.getState().selectedFilePath)
        const notesPath = useWorkspaceStore.getState().config?.notesPath

        if (zone === "explorer" && notePaths.length > 0 && onImportNotesToExplorer && notesPath) {
          const point = toCssPoint(event.payload.position)
          const destinationDir = findDropDirFromPoint(point.x, point.y) || notesPath
          try {
            await onImportNotesToExplorer(notePaths, destinationDir)
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
          } catch (error) {
            toast.error("插入图片失败", {
              description: error instanceof Error ? error.message : "无法导入图片",
            })
          }
          return
        }

        if (notePaths.length === 0) {
          if (imagePaths.length > 0) {
            toast.message(zone === "explorer" ? "图片请拖到编辑区插入" : "请先打开一篇笔记", {
              description:
                zone === "explorer"
                  ? "资源管理器目前支持导入 .md / .txt"
                  : "打开笔记后再拖入图片，会复制到 assets",
            })
            return
          }
          toast.error("未识别到可打开文件", {
            description: "请拖入 .md / .txt",
          })
          return
        }

        try {
          setViewMode("preview")
          for (const path of notePaths) {
            await selectFile(path)
          }
          await selectFile(notePaths[0])
          toast.success(notePaths.length === 1 ? "已打开预览" : `已打开 ${notePaths.length} 个文件`, {
            description: notePaths[0].split("/").pop(),
          })
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
