import {
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import { Download, Info, Lightbulb, Link2, Pencil, RotateCcw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { ImageLightbox } from "~/components/App/ImageLightbox"
import { PreviewEmptyHint } from "~/components/App/EditorEmptyGuide"
import {
  ExportMermaidBatchDialog,
  type MermaidBatchExportSettings,
} from "~/components/App/ExportMermaidBatchDialog"
import { MermaidBlock } from "~/components/App/MermaidBlock"
import { PreviewCodeBlock } from "~/components/App/PreviewCodeBlock"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  useContentFontZoom,
} from "~/hooks/use-content-font-zoom"
import { getFencedCodeMeta } from "~/lib/code-fence"
import { exportMermaidBatch, hasMermaidBlocks } from "~/lib/export"
import { getMarkdownRehypePlugins, markdownRemarkPlugins } from "~/lib/markdown-plugins"
import { resolveMarkdownAssetUrl } from "~/lib/markdown"
import { normalizeTaskListSyntax } from "~/lib/task-list"
import { expandWikiLinks, isWikiHref, parseWikiHref, resolveWikiStem } from "~/lib/wiki"
import { getParentPath } from "~/lib/workspace"
import { useWorkspaceStore } from "~/store/workspace"
import { cn } from "~/lib/utils"

interface Props {
  content: string
  onScroll?: (scrollTop: number) => void
  containerRef?: RefObject<HTMLDivElement | null>
}

interface PreviewImage {
  src: string
  alt: string
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")

const CALLOUTS = {
  note: { label: "笔记", tone: "note", Icon: Pencil },
  info: { label: "笔记", tone: "note", Icon: Info },
  abstract: { label: "笔记", tone: "note", Icon: Pencil },
  tip: { label: "小技巧", tone: "tip", Icon: Lightbulb },
  hint: { label: "小技巧", tone: "tip", Icon: Lightbulb },
  warning: { label: "注意", tone: "warning", Icon: TriangleAlert },
  caution: { label: "注意", tone: "warning", Icon: TriangleAlert },
  important: { label: "重要", tone: "important", Icon: Info },
} as const

type CalloutKind = keyof typeof CALLOUTS

const CALLOUT_MARKER = /^\s*\[!(note|info|abstract|tip|hint|warning|caution|important)\][ \t]*([^\n]*)(?:\n([\s\S]*))?$/i

interface PeeledCallout {
  kind: CalloutKind
  title: string
  node: ReactNode
}

const peelCallout = (node: ReactNode): PeeledCallout | null => {
  if (typeof node === "string") {
    const match = node.match(CALLOUT_MARKER)
    if (!match) {
      return null
    }
    const kind = match[1].toLowerCase() as CalloutKind
    const leftover = (match[3] ?? "").replace(/^\n/, "")
    return {
      kind,
      title: match[2].trim(),
      node: leftover.trim() ? leftover.replace(/^\n/, "") : null,
    }
  }

  if (Array.isArray(node)) {
    const next = [...node]
    for (let index = 0; index < next.length; index += 1) {
      const child = next[index]
      if (child == null || child === false || child === "") {
        continue
      }
      if (typeof child === "string" && !child.trim()) {
        continue
      }
      const peeled = peelCallout(child)
      if (!peeled) {
        return null
      }
      next[index] = peeled.node
      return {
        kind: peeled.kind,
        title: peeled.title,
        node: next.filter((item) => item != null && item !== ""),
      }
    }
    return null
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    const peeled = peelCallout(node.props.children)
    if (!peeled) {
      return null
    }
    const empty =
      peeled.node == null ||
      peeled.node === "" ||
      (typeof peeled.node === "string" && !peeled.node.trim())
    return {
      kind: peeled.kind,
      title: peeled.title,
      node: empty ? null : cloneElement(node as ReactElement<{ children?: ReactNode }>, undefined, peeled.node),
    }
  }

  return null
}

export const MarkdownPreview = ({ content, onScroll, containerRef }: Props) => {
  const { config, selectedFilePath, tree, selectFile } = useWorkspaceStore()
  const workspaceRoot = config ? getParentPath(config.notesPath) : ""
  const enableHighlight = config?.settings.codeHighlight ?? true
  const showCodeLineNumbers = config?.settings.codeBlockLineNumbers ?? true
  const mermaidTheme = config?.settings.mermaidTheme ?? "auto"
  const [lightbox, setLightbox] = useState<PreviewImage | null>(null)
  const [exportingMermaid, setExportingMermaid] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchDefaultFormat, setBatchDefaultFormat] = useState<"svg" | "png">("png")
  // Same as editor: stable useRef so wheel listener is not torn down on font-size re-renders.
  const previewRef = useRef<HTMLDivElement>(null)
  const { fontSize, zoomHudVisible, resetFontSize } = useContentFontZoom(previewRef)

  const assignPreviewRef = useCallback(
    (node: HTMLDivElement | null) => {
      previewRef.current = node
      if (containerRef) {
        containerRef.current = node
      }
    },
    [containerRef]
  )

  const normalizedContent = useMemo(
    () => expandWikiLinks(normalizeTaskListSyntax(content)),
    [content]
  )

  const showMermaidToolbar = useMemo(() => hasMermaidBlocks(content), [content])

  const rehypePlugins = useMemo(
    () => getMarkdownRehypePlugins(enableHighlight),
    [enableHighlight]
  )

  const openBatchExport = (format: "svg" | "png") => {
    setBatchDefaultFormat(format)
    setBatchDialogOpen(true)
  }

  const handleMermaidBatch = async (settings: MermaidBatchExportSettings) => {
    if (exportingMermaid) {
      return
    }
    const blocks = settings.items
      .filter((item) => settings.selectedIds.includes(item.id))
      .map((item) => item.code)
    if (blocks.length === 0) {
      toast.message("请至少选择一个图表")
      return
    }

    setExportingMermaid(true)
    const toastId = toast.loading(
      settings.format === "svg" ? "正在导出 SVG…" : "正在导出 PNG…"
    )
    try {
      const count = await exportMermaidBatch({
        blocks,
        format: settings.format,
        mermaidTheme,
        background: settings.background,
        padding: settings.padding,
        scale: settings.scale,
        onProgress: (message) => toast.loading(message, { id: toastId }),
      })
      if (count === 0) {
        toast.dismiss(toastId)
        toast.message("已取消导出")
        return
      }
      toast.success(`已导出 ${count} 个图表`, { id: toastId })
    } catch (error) {
      toast.error("导出失败", {
        id: toastId,
        description: error instanceof Error ? error.message : "无法导出 Mermaid 图表",
      })
    } finally {
      setExportingMermaid(false)
    }
  }

  const components: Components = useMemo(
    () => ({
      h1: ({ children }) => <h1 id={slugify(extractText(children))}>{children}</h1>,
      h2: ({ children }) => <h2 id={slugify(extractText(children))}>{children}</h2>,
      h3: ({ children }) => <h3 id={slugify(extractText(children))}>{children}</h3>,
      h4: ({ children }) => <h4 id={slugify(extractText(children))}>{children}</h4>,
      h5: ({ children }) => <h5 id={slugify(extractText(children))}>{children}</h5>,
      h6: ({ children }) => <h6 id={slugify(extractText(children))}>{children}</h6>,
      ul: ({ children, className, ...props }) => (
        <ul className={cn(className)} {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, className, ...props }) => (
        <ol className={cn(className)} {...props}>
          {children}
        </ol>
      ),
      li: ({ children, className, ...props }) => (
        <li className={cn(className)} {...props}>
          {children}
        </li>
      ),
      input: ({ type, checked, disabled, className, ...props }) => {
        if (type === "checkbox") {
          return (
            <input
              {...props}
              type="checkbox"
              className={cn("markdown-task-checkbox", className)}
              checked={Boolean(checked)}
              disabled={disabled ?? true}
              readOnly
              onChange={() => undefined}
            />
          )
        }
        return <input type={type} checked={checked} disabled={disabled} className={className} {...props} />
      },
      img: ({ src, alt, className, ...props }) => {
        const resolvedSrc =
          typeof src === "string" ? resolveMarkdownAssetUrl(src, selectedFilePath ?? "", workspaceRoot) : src
        if (!resolvedSrc || typeof resolvedSrc !== "string") {
          return null
        }
        return (
          <button
            type="button"
            className="markdown-preview-image-button my-4 block w-fit max-w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
            onClick={() => setLightbox({ src: resolvedSrc, alt: alt ?? "" })}
            title="点击放大预览"
          >
            <img
              src={resolvedSrc}
              alt={alt}
              {...props}
              className={cn("max-w-full rounded-lg border border-border/30", className)}
            />
          </button>
        )
      },
      a: ({ href, children, ...props }) => {
        const safeHref = typeof href === "string" ? href : ""
        if (isWikiHref(safeHref)) {
          const parsed = parseWikiHref(safeHref)
          const stem = parsed?.stem ?? ""
          const target = stem ? resolveWikiStem(tree, stem) : null
          return (
            <button
              type="button"
              title={target ? `打开笔记：${stem}` : `未找到笔记：${stem}`}
              className={cn(
                "inline cursor-pointer border-0 bg-transparent p-0 text-[0.95em] underline decoration-current/35 underline-offset-[3px]",
                target
                  ? "text-primary hover:decoration-current"
                  : "text-amber-700 hover:decoration-current dark:text-amber-300"
              )}
              onClick={() => {
                if (!stem) {
                  return
                }
                if (!target) {
                  toast.error("未找到对应笔记", {
                    description: `没有名为「${stem}」的文件。双链名称需与笔记文件名（不含后缀）一致。`,
                  })
                  return
                }
                void selectFile(target)
              }}
            >
              <Link2 className="size-3.5 shrink-0 opacity-80" strokeWidth={2} />
              {children}
            </button>
          )
        }
        return (
          <a
            href={safeHref}
            {...props}
            className="text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </a>
        )
      },
      blockquote: ({ children }) => {
        const peeled = peelCallout(children)
        if (!peeled) {
          return <blockquote>{children}</blockquote>
        }
        const spec = CALLOUTS[peeled.kind]
        const Icon = spec.Icon
        return (
          <aside className={`markdown-callout markdown-callout-${spec.tone}`}>
            <div className="markdown-callout-title">
              <Icon strokeWidth={2} />
              <span>{peeled.title || spec.label}</span>
            </div>
            {peeled.node ? <div className="markdown-callout-body">{peeled.node}</div> : null}
          </aside>
        )
      },
      pre: ({ children }) => {
        const meta = getFencedCodeMeta(children)
        if (meta.language === "mermaid") {
          return <MermaidBlock code={meta.text} />
        }
        return <PreviewCodeBlock showLineNumbers={showCodeLineNumbers}>{children}</PreviewCodeBlock>
      },
      table: ({ children, ...props }) => (
        <div className="markdown-table-wrap">
          <table {...props}>{children}</table>
        </div>
      ),
    }),
    [selectedFilePath, workspaceRoot, showCodeLineNumbers, tree, selectFile]
  )

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        {showMermaidToolbar ? (
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-sidebar px-3">
            <span className="truncate text-[12px] text-muted-foreground">本文含 Mermaid 图表</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground"
                    disabled={exportingMermaid}
                  />
                }
              >
                <Download className="size-3.5" />
                导出图表
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem
                  disabled={exportingMermaid}
                  onClick={() => openBatchExport("svg")}
                >
                  批量导出 SVG
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportingMermaid}
                  onClick={() => openBatchExport("png")}
                >
                  批量导出 PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1">
          {/* Scroller stays font-size stable (like .cm-scroller); zoom the inner content only. */}
          <div
            ref={assignPreviewRef}
            className="h-full overflow-auto bg-background [overflow-anchor:none]"
            onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
          >
            <div
              className="markdown-preview markdown-preview-loose px-10 py-9"
              style={{ fontSize: `${fontSize}px` }}
            >
              {!normalizedContent.trim() ? (
                <PreviewEmptyHint />
              ) : (
                <div className="mx-auto max-w-3xl space-y-1">
                  <ReactMarkdown
                    remarkPlugins={markdownRemarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={components}
                  >
                    {normalizedContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
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
                  onClick={() => resetFontSize()}
                >
                  <RotateCcw className="size-3.5" />
                  重置
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ImageLightbox
        open={lightbox !== null}
        src={lightbox?.src ?? ""}
        alt={lightbox?.alt}
        onClose={() => setLightbox(null)}
      />

      <ExportMermaidBatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        content={content}
        defaultFormat={batchDefaultFormat}
        onConfirm={(settings) => {
          void handleMermaidBatch(settings)
        }}
      />
    </>
  )
}

const extractText = (children: React.ReactNode): string => {
  if (typeof children === "string") return children
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ""
}
