import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { xml } from "@codemirror/lang-xml"
import { indentUnit, StreamLanguage } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { AlignLeft, ImagePlus, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { EditorEmptyGuide } from "~/components/App/EditorEmptyGuide"
import { Button } from "~/components/ui/button"
import {
  buildImageMarkdown,
  extensionFromMime,
  extensionFromPath,
  importImageBytes,
  importImageFromPath,
  isImagePath,
} from "~/lib/assets"
import { tryFormatByExtension } from "~/lib/format-code"
import { getFileExtension, isMarkdownPath } from "~/lib/file-types"
import { writeTextToClipboard } from "~/lib/workspace"
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

const SANS_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

const MIN_EDITOR_FONT_SIZE = 10
const MAX_EDITOR_FONT_SIZE = 48
const DEFAULT_EDITOR_FONT_SIZE = defaultSettings.editorFontSize || 14

interface LineMenuState {
  x: number
  y: number
  from: number
  to: number
  text: string
  lineNumber: number
}

const iniLanguage = StreamLanguage.define({
  name: "ini",
  token(stream) {
    if (stream.eatSpace()) {
      return null
    }
    if (stream.match(/[;#].*$/)) {
      return "comment"
    }
    if (stream.match(/\[[^\]]*\]/)) {
      return "heading"
    }
    if (stream.match(/[^=\s][^=]*/)) {
      if (stream.peek() === "=") {
        return "attributeName"
      }
      return "string"
    }
    if (stream.match("=")) {
      return "operator"
    }
    if (stream.match(/.+/)) {
      return "string"
    }
    stream.next()
    return null
  },
})

const languageExtensionForPath = (path: string | null) => {
  const extension = path ? getFileExtension(path) : "md"
  if (extension === "json") {
    return json()
  }
  if (extension === "xml" || extension === "svg") {
    return xml()
  }
  if (extension === "ini") {
    return iniLanguage
  }
  if (extension === "txt") {
    return []
  }
  return markdown()
}

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
  const tabSize = settings?.tabSize && settings.tabSize > 0 ? settings.tabSize : 2
  const allowImageInsert = Boolean(selectedFilePath && isMarkdownPath(selectedFilePath))
  const languageExtension = useMemo(() => languageExtensionForPath(selectedFilePath), [selectedFilePath])
  const extension = selectedFilePath ? getFileExtension(selectedFilePath) : ""
  const canFormat = ["json", "xml", "svg", "ini"].includes(extension)
  const isMarkdown = Boolean(selectedFilePath && isMarkdownPath(selectedFilePath))
  const rawFamily = settings?.editorFontFamily?.trim() || MONO_STACK
  const fontFamily = isMarkdown ? SANS_STACK : rawFamily || MONO_STACK
  const wordWrap = settings?.wordWrap ?? true

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
  const [lineMenu, setLineMenu] = useState<LineMenuState | null>(null)

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
        contextmenu(event, view) {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos == null) {
            return false
          }
          event.preventDefault()
          const line = view.state.doc.lineAt(pos)
          const lineEnd =
            line.number < view.state.doc.lines
              ? view.state.doc.line(line.number + 1).from
              : line.to
          setLineMenu({
            x: event.clientX,
            y: event.clientY,
            from: line.from,
            to: lineEnd,
            text: line.text,
            lineNumber: line.number,
          })
          return true
        },
        paste(event) {
          if (!allowImageInsert) {
            return false
          }
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
          if (!allowImageInsert) {
            return false
          }
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
    [allowImageInsert]
  )

  useEffect(() => {
    if (!lineMenu) {
      return
    }
    const close = () => setLineMenu(null)
    window.addEventListener("mousedown", close)
    window.addEventListener("keydown", close)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("keydown", close)
    }
  }, [lineMenu])

  const handleFormat = () => {
    const formatted = tryFormatByExtension(extension, value)
    if (formatted == null) {
      toast.error("格式化失败", { description: "请检查语法是否正确" })
      return
    }
    onChange(formatted)
    toast.success("已格式化")
  }

  const charCount = value.length
  const lineCount = value.length === 0 ? 0 : value.split(/\n/).length

  // Integer px line-height — fractional 14*1.7 (=23.8) drifts gutters vs content when scrolling.
  const lineHeightPx = Math.round(fontSize * 1.7)

  const themeExtension = useMemo(
    () =>
      EditorView.theme(
        {
          "&": {
            height: "100%",
            fontSize: `${fontSize}px`,
            fontFamily,
            fontVariationSettings: "normal",
            backgroundColor: isDark ? "#16171d" : "#ffffff",
            color: isDark ? "#e6e8ef" : "#1e1e2e",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`,
            fontVariationSettings: "normal",
            padding: "20px 0",
          },
          ".cm-content": {
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`,
            caretColor: isDark ? "#c4b5fd" : "#7c3aed",
            color: isDark ? "#e6e8ef" : "#1e1e2e",
            padding: "0 16px",
            minHeight: "100%",
            fontVariationSettings: "normal",
          },
          ".cm-line": {
            display: "block",
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`,
            minHeight: `${lineHeightPx}px`,
            padding: "0 4px",
            color: isDark ? "#e6e8ef" : "#1e1e2e",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: isDark ? "#c4b5fd" : "#7c3aed",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-gutters": {
            backgroundColor: isDark ? "#16171d" : "#ffffff",
            color: isDark ? "#5c6370" : "#c4c4cc",
            border: "none",
            fontSize: `${Math.max(11, fontSize - 2)}px`,
            lineHeight: `${lineHeightPx}px`,
          },
          ".cm-gutterElement": {
            lineHeight: `${lineHeightPx}px`,
            fontSize: `${Math.max(11, fontSize - 2)}px`,
            minWidth: "2.2em",
          },
          ".cm-activeLine": {
            backgroundColor: isDark ? "rgba(167, 139, 250, 0.12)" : "rgba(139, 92, 246, 0.08)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: isDark ? "rgba(167, 139, 250, 0.14)" : "rgba(139, 92, 246, 0.1)",
            color: isDark ? "#c4b5fd" : "#7c3aed",
          },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
            backgroundColor: isDark
              ? "rgba(167, 139, 250, 0.28) !important"
              : "rgba(139, 92, 246, 0.2) !important",
          },
        },
        { dark: isDark }
      ),
    [fontFamily, fontSize, isDark, lineHeightPx]
  )

  const showToolbar = allowImageInsert || canFormat

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      {showToolbar ? (
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/40 bg-muted/20 px-2">
          {allowImageInsert ? (
            <>
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
            </>
          ) : null}
          {canFormat ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground"
              disabled={readOnly}
              onClick={handleFormat}
            >
              <AlignLeft className="size-3.5" />
              格式化
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="relative min-h-0 min-w-0 flex-1">
        {!value.trim() && selectedFilePath ? (
          <EditorEmptyGuide
            path={selectedFilePath}
            onInsertTemplate={(template) => onChange(template)}
          />
        ) : null}
        <div
          ref={containerRef}
          className={cn("codemirror-host absolute inset-0 overflow-hidden")}
          style={
            {
              "--cm-font-size": `${fontSize}px`,
              "--cm-line-height": `${lineHeightPx}px`,
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
              theme={isDark ? oneDark : "light"}
              style={{ height: "100%", fontSize: `${fontSize}px`, fontFamily }}
              extensions={[
                languageExtension,
                ...(wordWrap ? [EditorView.lineWrapping] : []),
                EditorState.tabSize.of(tabSize),
                indentUnit.of(" ".repeat(tabSize)),
                themeExtension,
                imageHandlers,
              ].flat()}
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

        <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-lg border border-border/40 bg-background/85 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground shadow-sm backdrop-blur-sm">
          {charCount} 字符 · {lineCount} 行
        </div>

        {lineMenu ? (
          <div
            className="fixed z-50 min-w-[9rem] overflow-hidden rounded-xl border border-border/60 bg-popover p-1 shadow-lg"
            style={{ left: lineMenu.x, top: lineMenu.y }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {(
              [
                {
                  label: "复制行",
                  action: () => {
                    void writeTextToClipboard(lineMenu.text)
                      .then(() => toast.success("已复制当前行"))
                      .catch(() => toast.error("复制失败"))
                  },
                },
                {
                  label: "删除行",
                  action: () => {
                    const view = viewRef.current
                    if (!view) {
                      return
                    }
                    view.dispatch({
                      changes: { from: lineMenu.from, to: lineMenu.to, insert: "" },
                    })
                  },
                },
                {
                  label: "上移一行",
                  action: () => {
                    const view = viewRef.current
                    if (!view || lineMenu.lineNumber <= 1) {
                      return
                    }
                    const doc = view.state.doc
                    const current = doc.line(lineMenu.lineNumber)
                    const prev = doc.line(lineMenu.lineNumber - 1)
                    view.dispatch({
                      changes: {
                        from: prev.from,
                        to: current.to,
                        insert: `${current.text}\n${prev.text}`,
                      },
                      selection: { anchor: prev.from },
                    })
                  },
                },
                {
                  label: "下移一行",
                  action: () => {
                    const view = viewRef.current
                    if (!view || lineMenu.lineNumber >= view.state.doc.lines) {
                      return
                    }
                    const doc = view.state.doc
                    const current = doc.line(lineMenu.lineNumber)
                    const next = doc.line(lineMenu.lineNumber + 1)
                    view.dispatch({
                      changes: {
                        from: current.from,
                        to: next.to,
                        insert: `${next.text}\n${current.text}`,
                      },
                      selection: { anchor: current.from + next.text.length + 1 },
                    })
                  },
                },
              ] as const
            ).map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] text-foreground hover:bg-muted"
                onClick={() => {
                  item.action()
                  setLineMenu(null)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

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
