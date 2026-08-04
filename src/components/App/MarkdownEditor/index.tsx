import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { ImagePlus, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import {
  buildImageMarkdown,
  extensionFromMime,
  extensionFromPath,
  importImageBytes,
  importImageFromPath,
  isImagePath,
} from "~/lib/assets"
import { defaultSettings } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

interface Props {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  onCreateEditor?: (view: EditorView) => void
}

interface ImportImageInput {
  sourcePath?: string
  bytes?: Uint8Array
  extension: string
  alt?: string
}

const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'

const MIN_EDITOR_FONT_SIZE = 10
const MAX_EDITOR_FONT_SIZE = 48
const DEFAULT_EDITOR_FONT_SIZE = defaultSettings.editorFontSize || 14

const subscribeSystemDark = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

const getSystemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches

const insertAtCursor = (view: EditorView, text: string) => {
  const { from, to } = view.state.selection.main
  const insert = text.endsWith("\n") ? text : `${text}\n`
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    scrollIntoView: true,
  })
  view.focus()
}

export const MarkdownEditor = ({ value, onChange, readOnly = false, onCreateEditor }: Props) => {
  const { config, selectedFilePath, updateSettings } = useWorkspaceStore()
  const settings = config?.settings
  const themeMode = settings?.themeMode ?? "system"
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false)
  const isDark = themeMode === "dark" || (themeMode === "system" && systemDark)
  const settingsFontSize =
    settings?.editorFontSize && settings.editorFontSize > 0 ? settings.editorFontSize : DEFAULT_EDITOR_FONT_SIZE
  const rawFamily = settings?.editorFontFamily?.trim() || MONO_STACK
  const fontFamily =
    /inter|variable|sans/i.test(rawFamily) && !/mono|consolas|menlo|courier/i.test(rawFamily)
      ? MONO_STACK
      : rawFamily

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<(input: ImportImageInput) => Promise<void>>(async () => undefined)
  const fontSizeRef = useRef(settingsFontSize)
  const persistTimerRef = useRef<number | null>(null)
  const hideHudTimerRef = useRef<number | null>(null)
  const [height, setHeight] = useState(0)
  const [fontSize, setFontSize] = useState(settingsFontSize)
  const [zoomHudVisible, setZoomHudVisible] = useState(false)

  fontSizeRef.current = fontSize

  useEffect(() => {
    setFontSize(settingsFontSize)
  }, [settingsFontSize])

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const update = () => {
      setHeight(Math.max(0, Math.floor(element.getBoundingClientRect().height)))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const showZoomHud = () => {
    setZoomHudVisible(true)
    if (hideHudTimerRef.current) {
      window.clearTimeout(hideHudTimerRef.current)
    }
    hideHudTimerRef.current = window.setTimeout(() => {
      setZoomHudVisible(false)
    }, 1600)
  }

  const persistFontSize = (next: number) => {
    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = window.setTimeout(() => {
      void updateSettings({ editorFontSize: next })
    }, 280)
  }

  const applyFontSize = (next: number) => {
    const clamped = Math.min(MAX_EDITOR_FONT_SIZE, Math.max(MIN_EDITOR_FONT_SIZE, Math.round(next)))
    setFontSize(clamped)
    showZoomHud()
    persistFontSize(clamped)
  }

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      event.preventDefault()
      const delta = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0
      if (delta === 0) {
        return
      }
      const clamped = Math.min(
        MAX_EDITOR_FONT_SIZE,
        Math.max(MIN_EDITOR_FONT_SIZE, Math.round(fontSizeRef.current + delta))
      )
      fontSizeRef.current = clamped
      setFontSize(clamped)
      setZoomHudVisible(true)
      if (hideHudTimerRef.current) {
        window.clearTimeout(hideHudTimerRef.current)
      }
      hideHudTimerRef.current = window.setTimeout(() => {
        setZoomHudVisible(false)
      }, 1600)
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current)
      }
      persistTimerRef.current = window.setTimeout(() => {
        void updateSettings({ editorFontSize: clamped })
      }, 280)
    }

    element.addEventListener("wheel", onWheel, { passive: false, capture: true })
    return () => {
      element.removeEventListener("wheel", onWheel, { capture: true })
    }
  }, [updateSettings])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current)
      }
      if (hideHudTimerRef.current) {
        window.clearTimeout(hideHudTimerRef.current)
      }
    }
  }, [])

  importRef.current = async (input: ImportImageInput) => {
    if (!config?.assetsPath || !selectedFilePath) {
      toast.error("请先打开一篇笔记再插入图片")
      return
    }

    try {
      const absolutePath = input.sourcePath
        ? await importImageFromPath({ assetsPath: config.assetsPath, sourcePath: input.sourcePath })
        : await importImageBytes({
            assetsPath: config.assetsPath,
            bytes: input.bytes ?? new Uint8Array(),
            extension: input.extension,
          })

      const markdownSyntax = buildImageMarkdown({
        markdownFilePath: selectedFilePath,
        assetAbsolutePath: absolutePath,
        alt: input.alt,
      })

      if (viewRef.current) {
        insertAtCursor(viewRef.current, markdownSyntax)
      } else {
        onChange(`${value}${value.endsWith("\n") || !value ? "" : "\n"}${markdownSyntax}\n`)
      }
      toast.success("图片已插入")
    } catch (error) {
      toast.error("插入图片失败", {
        description: error instanceof Error ? error.message : "无法写入资源目录",
      })
    }
  }

  const imageHandlers = useMemo(
    () =>
      EditorView.domEventHandlers({
        paste(event) {
          const items = event.clipboardData?.items
          if (!items || items.length === 0) {
            return false
          }

          const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"))
          if (!imageItem) {
            return false
          }

          const file = imageItem.getAsFile()
          if (!file) {
            return false
          }

          event.preventDefault()
          void file.arrayBuffer().then((buffer) => {
            void importRef.current({
              bytes: new Uint8Array(buffer),
              extension: extensionFromMime(file.type || imageItem.type),
            })
          })
          return true
        },
        drop(event) {
          const files = event.dataTransfer?.files
          if (!files || files.length === 0) {
            return false
          }

          const imageFiles = Array.from(files).filter(
            (file) => file.type.startsWith("image/") || isImagePath(file.name)
          )
          if (imageFiles.length === 0) {
            return false
          }

          event.preventDefault()
          void (async () => {
            for (const file of imageFiles) {
              const buffer = new Uint8Array(await file.arrayBuffer())
              await importRef.current({
                bytes: buffer,
                extension: extensionFromPath(file.name) || extensionFromMime(file.type),
                alt: file.name.replace(/\.[^.]+$/, ""),
              })
            }
          })()
          return true
        },
      }),
    []
  )

  const themeExtension = useMemo(
    () =>
      EditorView.theme(
        {
          "&": {
            height: "100%",
            fontSize: `${fontSize}px`,
            fontFamily,
            fontVariationSettings: "normal",
            backgroundColor: isDark ? "#1a1b26" : "#ffffff",
            color: isDark ? "#e8eaf2" : "#1e1e2e",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: "1.7",
            fontVariationSettings: "normal",
          },
          ".cm-content": {
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: "1.7",
            caretColor: isDark ? "#e8eaf2" : "#1e1e2e",
            color: isDark ? "#e8eaf2" : "#1e1e2e",
            padding: "20px 16px",
            minHeight: "100%",
            fontVariationSettings: "normal",
          },
          ".cm-line": {
            display: "block",
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: "1.7",
            minHeight: `${Math.round(fontSize * 1.7)}px`,
            padding: "0 4px",
            color: isDark ? "#e8eaf2" : "#1e1e2e",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: isDark ? "#e8eaf2" : "#1e1e2e",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-gutters": {
            backgroundColor: isDark ? "#1a1b26" : "#ffffff",
            color: isDark ? "#9aa3b8" : "#6b7280",
            border: "none",
            fontSize: `${fontSize}px`,
            lineHeight: "1.7",
          },
          ".cm-gutterElement": {
            minHeight: `${Math.round(fontSize * 1.7)}px`,
            lineHeight: "1.7",
            fontSize: `${fontSize}px`,
          },
          ".cm-activeLine": {
            backgroundColor: isDark ? "rgba(137, 180, 250, 0.12)" : "rgba(37, 99, 235, 0.06)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: isDark ? "rgba(137, 180, 250, 0.12)" : "rgba(37, 99, 235, 0.06)",
          },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
            backgroundColor: isDark
              ? "rgba(137, 180, 250, 0.35) !important"
              : "rgba(37, 99, 235, 0.2) !important",
          },
        },
        { dark: isDark }
      ),
    [fontFamily, fontSize, isDark]
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/40 bg-muted/20 px-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground"
          disabled={readOnly || !selectedFilePath}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-3.5" />
          插入图片
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ""
            void (async () => {
              for (const file of files) {
                const buffer = new Uint8Array(await file.arrayBuffer())
                await importRef.current({
                  bytes: buffer,
                  extension: extensionFromPath(file.name) || extensionFromMime(file.type),
                  alt: file.name.replace(/\.[^.]+$/, ""),
                })
              }
            })()
          }}
        />
      </div>

      <div className="relative min-h-0 min-w-0 flex-1">
        <div
          ref={containerRef}
          className={cn("codemirror-host absolute inset-0 overflow-hidden")}
          style={
            {
              "--cm-font-size": `${fontSize}px`,
              "--cm-font-family": fontFamily,
              fontSize: `${fontSize}px`,
            } as CSSProperties
          }
        >
          {height > 0 ? (
            <CodeMirror
              key={selectedFilePath ?? "empty"}
              value={value}
              height={`${height}px`}
              maxHeight={`${height}px`}
              theme={isDark ? "dark" : "light"}
              style={{ height: "100%", fontSize: `${fontSize}px`, fontFamily }}
              extensions={[
                markdown(),
                EditorView.lineWrapping,
                EditorState.tabSize.of(settings?.tabSize ?? 2),
                themeExtension,
                imageHandlers,
              ]}
              basicSetup={{
                lineNumbers: settings?.showLineNumbers ?? true,
                foldGutter: false,
                autocompletion: false,
                indentOnInput: true,
                highlightActiveLine: true,
                highlightSelectionMatches: false,
              }}
              readOnly={readOnly}
              onChange={onChange}
              onCreateEditor={(view) => {
                viewRef.current = view
                requestAnimationFrame(() => view.requestMeasure())
                onCreateEditor?.(view)
              }}
            />
          ) : null}
        </div>

        {zoomHudVisible ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[18%] z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border/50 bg-background/95 px-4 py-2.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
              <div className="min-w-[4.5rem] text-center">
                <div className="text-[11px] text-muted-foreground">字号</div>
                <div className="text-lg font-semibold tabular-nums tracking-tight">{fontSize}px</div>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-3 text-[12px]"
                onClick={() => applyFontSize(DEFAULT_EDITOR_FONT_SIZE)}
              >
                <RotateCcw className="size-3.5" />
                重置
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Insert markdown image syntax at the current cursor (used by OS drag-drop). */
export const insertMarkdownAtCursor = (view: EditorView, text: string) => {
  insertAtCursor(view, text)
}
