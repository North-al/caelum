import { useMemo, useState, type RefObject } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import { ImageLightbox } from "~/components/App/ImageLightbox"
import { PreviewEmptyHint } from "~/components/App/EditorEmptyGuide"
import { PreviewCodeBlock } from "~/components/App/PreviewCodeBlock"
import { resolveMarkdownAssetUrl } from "~/lib/markdown"
import { normalizeTaskListSyntax } from "~/lib/task-list"
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
  const { config, selectedFilePath } = useWorkspaceStore()
  const workspaceRoot = config ? getParentPath(config.notesPath) : ""
  const enableHighlight = config?.settings.codeHighlight ?? true
  const showCodeLineNumbers = config?.settings.codeBlockLineNumbers ?? true
  const [lightbox, setLightbox] = useState<PreviewImage | null>(null)

  const normalizedContent = useMemo(() => normalizeTaskListSyntax(content), [content])

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
    [selectedFilePath, workspaceRoot, showCodeLineNumbers]
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
