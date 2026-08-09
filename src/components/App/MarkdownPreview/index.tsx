import { useMemo, useState, type RefObject } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Link2 } from "lucide-react"
import { toast } from "sonner"

import { ImageLightbox } from "~/components/App/ImageLightbox"
import { PreviewEmptyHint } from "~/components/App/EditorEmptyGuide"
import { PreviewCodeBlock } from "~/components/App/PreviewCodeBlock"
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

export const MarkdownPreview = ({ content, onScroll, containerRef }: Props) => {
  const { config, selectedFilePath, tree, selectFile } = useWorkspaceStore()
  const workspaceRoot = config ? getParentPath(config.notesPath) : ""
  const enableHighlight = config?.settings.codeHighlight ?? true
  const showCodeLineNumbers = config?.settings.codeBlockLineNumbers ?? true
  const [lightbox, setLightbox] = useState<PreviewImage | null>(null)

  const normalizedContent = useMemo(
    () => expandWikiLinks(normalizeTaskListSyntax(content)),
    [content]
  )

  const rehypePlugins = useMemo(
    () => (enableHighlight ? [rehypeHighlight] : []),
    [enableHighlight]
  )

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
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.95em] font-medium underline-offset-2 transition-colors",
                target
                  ? "bg-primary/10 text-primary hover:bg-primary/15 hover:underline"
                  : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
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
      pre: ({ children }) => (
        <PreviewCodeBlock showLineNumbers={showCodeLineNumbers}>{children}</PreviewCodeBlock>
      ),
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
      <div
        ref={containerRef}
        className="markdown-preview markdown-preview-loose relative h-full min-h-0 overflow-auto bg-background px-10 py-9"
        onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
      >
        {!normalizedContent.trim() ? (
          <PreviewEmptyHint />
        ) : (
          <div className="mx-auto max-w-3xl space-y-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={rehypePlugins}
              components={components}
            >
              {normalizedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <ImageLightbox
        open={lightbox !== null}
        src={lightbox?.src ?? ""}
        alt={lightbox?.alt}
        onClose={() => setLightbox(null)}
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
