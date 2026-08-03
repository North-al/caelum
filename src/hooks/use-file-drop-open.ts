import { useEffect, useState } from "react"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { toast } from "sonner"

import { isImagePath } from "~/lib/assets"
import { isMarkdownFile, isTextFile } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"

const isOpenableNote = (path: string) => isMarkdownFile(path) || isTextFile(path)

interface Options {
  enabled?: boolean
  onInsertImages?: (paths: string[]) => Promise<void> | void
}

/**
 * Listen for OS file drops onto the Tauri window.
 * - Images (with an open note) → import into assets + insert markdown
 * - .md / .txt → open in preview
 */
export const useFileDropOpen = ({ enabled = true, onInsertImages }: Options = {}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragKind, setDragKind] = useState<"note" | "image" | "mixed" | null>(null)
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
          return
        }

        if (event.payload.type === "leave") {
          setIsDragging(false)
          setDragKind(null)
          return
        }

        if (event.payload.type !== "drop") {
          setIsDragging(false)
          setDragKind(null)
          return
        }

        setIsDragging(false)
        setDragKind(null)

        const paths = (event.payload.paths ?? []).map((path) => path.replace(/\\/g, "/"))
        const notePaths = paths.filter(isOpenableNote)
        const imagePaths = paths.filter(isImagePath)
        const hasOpenNote = Boolean(useWorkspaceStore.getState().selectedFilePath)

        if (imagePaths.length > 0 && hasOpenNote && onInsertImages) {
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
            toast.message("请先打开一篇笔记", {
              description: "打开笔记后再拖入图片，会复制到 assets 并以相对路径写入",
            })
            return
          }
          toast.error("未识别到可打开文件", {
            description: "请拖入 .md / .txt，或在打开笔记后拖入图片",
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
        // Non-Tauri environments (browser preview) ignore drag-drop wiring.
      })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [enabled, onInsertImages, selectFile, setViewMode])

  return { isDragging, dragKind }
}
